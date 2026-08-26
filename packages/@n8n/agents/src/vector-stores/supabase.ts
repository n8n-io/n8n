import { BaseVectorStore } from '../storage/base-vector-store';
import type {
	FilterCondition,
	VectorFilter,
	VectorQueryResult,
	VectorRecord,
} from '../types/sdk/vector-store';
import type { JSONObject } from '../types/utils/json';

/**
 * Written as `type` aliases, not `interface`s: the schema below assigns these to
 * `postgrest-js`'s `Record<string, unknown>` row slots, and only type-alias
 * object types carry the implicit index signature that assignment requires.
 */
type SupabaseMatchRow = {
	id: string;
	content: string;
	metadata: JSONObject;
	similarity: number;
};

/** Row layout of the pgvector-backed table this store reads from and writes to. */
type SupabaseVectorRow = {
	id: string;
	content: string;
	metadata: JSONObject;
	embedding: number[];
};

/**
 * Minimal typed schema for the (otherwise untyped) Supabase project this store
 * talks to. Table and RPC names are both configurable, so each is an index
 * signature: every table has the standard pgvector row layout and every RPC is
 * the similarity search taking `query_embedding` and returning
 * `SupabaseMatchRow[]`. Supplying this gives the whole
 * `from()`/`rpc()` → `.filter()`/`.limit()` chain concrete result types — without
 * a generated `Database` type, `postgrest-js` collapses the RPC `Returns` to
 * `any`.
 */
type SupabaseVectorSchema = {
	public: {
		Tables: {
			[table: string]: {
				Row: SupabaseVectorRow;
				Insert: SupabaseVectorRow;
				Update: Partial<SupabaseVectorRow>;
				Relationships: [];
			};
		};
		Views: Record<string, never>;
		Functions: {
			[fn: string]: {
				Args: { query_embedding: number[] };
				Returns: SupabaseMatchRow[];
			};
		};
	};
};

/**
 * Lazily loads `@supabase/supabase-js` (an optional peer dependency) and builds a
 * client typed against {@link SupabaseVectorSchema}. The stored client type is
 * derived from this function's return (see {@link SupabaseVectorClient}) so it
 * stays tied to the exact `SupabaseClient` declaration the runtime `import()`
 * resolves. A top-level `import type` in this CommonJS package would resolve a
 * different (`require`-condition, `.d.cts`) declaration whose `protected` members
 * make it nominally incompatible with the imported one.
 */
async function createSupabaseVectorClient(url: string, apiKey: string) {
	const { createClient } = await import('@supabase/supabase-js');
	return createClient<SupabaseVectorSchema>(url, apiKey);
}

type SupabaseVectorClient = Awaited<ReturnType<typeof createSupabaseVectorClient>>;

/**
 * Structural subset of `@supabase/postgrest-js`'s `PostgrestFilterBuilder` —
 * declared locally so filter-building stays generic over the real (highly
 * parameterized) builder type without depending on postgrest-js directly.
 * Every method returns `Self`, matching the real builder's `this`-returning
 * chain.
 */
interface PostgrestFilterChain<Self> {
	filter(column: string, operator: string, value: unknown): Self;
	not(column: string, operator: string, value: unknown): Self;
	or(filters: string): Self;
}

export type SupabaseVectorStoreOptions = {
	url: string;
	apiKey: string;
	tableName: string;
	/** Name of the similarity-search RPC function. Default: `match_documents`. */
	queryName?: string;
};

/**
 * Supabase backend (`@supabase/supabase-js` is an optional peer dependency),
 * built on PostgREST — never creates or alters schema. Expects an existing
 * table with the standard pgvector layout (id text primary key, content
 * text, metadata jsonb, embedding vector(n)) and a Postgres RPC function
 * (default name `match_documents`) that takes a `query_embedding` parameter
 * and returns rows shaped `{ id, content, metadata, similarity }` ordered by
 * distance:
 *
 * ```sql
 * create function match_documents(query_embedding vector(n))
 * returns table (id text, content text, metadata jsonb, similarity float)
 * language sql stable as $$
 *   select id, content, metadata, 1 - (embedding <=> query_embedding) as similarity
 *   from "<tableName>"
 *   order by embedding <=> query_embedding;
 * $$;
 * ```
 *
 * `match_count` is deliberately never passed to the RPC — PostgREST applies
 * `.filter()`/`.or()`/`.limit()` chained onto an `rpc()` call as a wrapping
 * subquery, so metadata filters are applied before `topK` truncates the
 * results rather than after, matching `PgVectorStore` semantics.
 *
 * On tables with an HNSW index, a selective metadata filter can make the
 * index scan return fewer than `topK` rows even when more matches exist.
 * `PgVectorStore` works around this with a per-query
 * `hnsw.iterative_scan` setting, which PostgREST cannot set — if you use
 * an HNSW index, set it at the role level instead:
 * `ALTER ROLE authenticator SET hnsw.iterative_scan = relaxed_order;`
 *
 * Filtering uses jsonb containment (`cs`) on the `metadata` column, so
 * `eq`/`in` are type-correct (number `5` does not match string `"5"`) and
 * `ne`/`nin` match rows that never had the filtered key.
 *
 * @example
 * ```typescript
 * const store = new SupabaseVectorStore('product-docs', {
 *   url: 'https://xyzcompany.supabase.co',
 *   apiKey: process.env.SUPABASE_SECRET_KEY!,
 *   tableName: 'product_docs',
 * });
 * ```
 */
export class SupabaseVectorStore extends BaseVectorStore<SupabaseVectorStoreOptions> {
	private readonly tableName: string;

	private readonly queryName: string;

	private client?: SupabaseVectorClient;

	constructor(name: string, options: SupabaseVectorStoreOptions) {
		super(name, options);
		this.tableName = options.tableName;
		this.queryName = options.queryName ?? 'match_documents';
	}

	async upsert(records: VectorRecord[]): Promise<void> {
		if (records.length === 0) return;

		const client = await this.getClient();
		const { error } = await client.from(this.tableName).upsert(
			records.map((record) => ({
				id: record.id,
				content: record.content,
				metadata: record.metadata,
				embedding: record.vector,
			})),
			{ onConflict: 'id' },
		);
		if (error) throw new Error(`Supabase upsert failed: ${error.message}`);
	}

	async query(
		vector: number[],
		opts: { topK: number; filter?: VectorFilter },
	): Promise<VectorQueryResult[]> {
		const client = await this.getClient();
		const rpcCall = client.rpc(this.queryName, {
			query_embedding: vector,
		});
		const filtered =
			opts.filter && opts.filter.conditions.length > 0
				? applySupabaseFilter(rpcCall, opts.filter)
				: rpcCall;

		const { data, error } = await filtered.limit(opts.topK);
		if (error) throw new Error(`Supabase query failed: ${error.message}`);

		return (data ?? []).map(toQueryResult);
	}

	async delete({ ids }: { ids: string[] }): Promise<void> {
		if (ids.length === 0) return;

		const client = await this.getClient();
		const { error } = await client.from(this.tableName).delete().in('id', ids);
		if (error) throw new Error(`Supabase delete failed: ${error.message}`);
	}

	close(): void {
		this.client = undefined;
	}

	private async getClient(): Promise<SupabaseVectorClient> {
		this.client ??= await createSupabaseVectorClient(
			this.constructorOptions.url,
			this.constructorOptions.apiKey,
		);
		return this.client;
	}
}

function toQueryResult(row: SupabaseMatchRow): VectorQueryResult {
	return {
		id: String(row.id),
		content: row.content,
		metadata: row.metadata ?? {},
		score: row.similarity,
	};
}

/** Negations are expressed as chained `.not()` filters so both `and`/`or` combinators work uniformly. */
function applySupabaseFilter<Builder extends PostgrestFilterChain<Builder>>(
	builder: Builder,
	filter: VectorFilter,
): Builder {
	if (filter.combineWith === 'or') {
		return builder.or(filter.conditions.map(toOrLogicTerm).join(','));
	}
	return filter.conditions.reduce(applyAndCondition, builder);
}

function applyAndCondition<Builder extends PostgrestFilterChain<Builder>>(
	builder: Builder,
	condition: FilterCondition,
): Builder {
	const { key, operator, value } = condition;

	switch (operator) {
		case 'eq':
			return builder.filter('metadata', 'cs', containmentJson(key, value));
		case 'ne':
			return builder.not('metadata', 'cs', containmentJson(key, value));
		case 'in': {
			assertNonEmptyArray(operator, key, value);
			return builder.or(
				value
					.map((candidate) => `metadata.cs.${quoteOrValue(containmentJson(key, candidate))}`)
					.join(','),
			);
		}
		case 'nin': {
			assertNonEmptyArray(operator, key, value);
			return value.reduce(
				(b, candidate) => b.not('metadata', 'cs', containmentJson(key, candidate)),
				builder,
			);
		}
		default:
			throw new Error(`Unsupported filter operator: "${String(operator)}"`);
	}
}

function toOrLogicTerm(condition: FilterCondition): string {
	const { key, operator, value } = condition;

	switch (operator) {
		case 'eq':
			return `metadata.cs.${quoteOrValue(containmentJson(key, value))}`;
		case 'ne':
			return `metadata.not.cs.${quoteOrValue(containmentJson(key, value))}`;
		case 'in': {
			assertNonEmptyArray(operator, key, value);
			return `or(${value.map((candidate) => `metadata.cs.${quoteOrValue(containmentJson(key, candidate))}`).join(',')})`;
		}
		case 'nin': {
			assertNonEmptyArray(operator, key, value);
			return `and(${value.map((candidate) => `metadata.not.cs.${quoteOrValue(containmentJson(key, candidate))}`).join(',')})`;
		}
		default:
			throw new Error(`Unsupported filter operator: "${String(operator)}"`);
	}
}

function containmentJson(key: string, value: unknown): string {
	return JSON.stringify({ [key]: value });
}

function assertNonEmptyArray(
	operator: string,
	key: string,
	value: unknown,
): asserts value is Array<string | number> {
	if (!Array.isArray(value) || value.length === 0) {
		throw new Error(
			`Filter operator "${operator}" on key "${key}" requires a non-empty array value.`,
		);
	}
}

/** PostgREST logic-string values containing reserved characters must be double-quoted. */
function quoteOrValue(value: string): string {
	return `"${value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;
}
