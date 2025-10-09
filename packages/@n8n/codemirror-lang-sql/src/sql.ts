import type { Completion, CompletionSource } from '@codemirror/autocomplete';
import {
	continuedIndent,
	foldNodeProp,
	indentNodeProp,
	LanguageSupport,
	LRLanguage,
} from '@codemirror/language';
import type { Extension } from '@codemirror/state';
import { parseMixed } from '@lezer/common';
import { styleTags, tags as t } from '@lezer/highlight';
import { expressionParser } from '@n8n/codemirror-lang';

import { completeFromSchema, completeKeywords } from './complete';
import { parser as baseParser } from './grammar.sql';
import type { Dialect } from './tokens';
import { dialect, SQLFunctions, SQLKeywords, SQLTypes, tokens, tokensFor } from './tokens';

const getSqlParser = () => {
	return baseParser.configure({
		props: [
			indentNodeProp.add({
				Statement: continuedIndent(),
			}),
			foldNodeProp.add({
				Statement(tree) {
					return { from: tree.firstChild!.to, to: tree.to };
				},
				BlockComment(tree) {
					return { from: tree.from + 2, to: tree.to - 2 };
				},
			}),
			styleTags({
				Keyword: t.keyword,
				Type: t.typeName,
				Builtin: t.standard(t.name),
				Bits: t.number,
				Bytes: t.string,
				Bool: t.bool,
				Null: t.null,
				// eslint-disable-next-line @typescript-eslint/naming-convention, id-denylist
				Number: t.number,
				// eslint-disable-next-line @typescript-eslint/naming-convention, id-denylist
				String: t.string,
				Identifier: t.name,
				QuotedIdentifier: t.special(t.string),
				SpecialVar: t.special(t.name),
				LineComment: t.lineComment,
				BlockComment: t.blockComment,
				Operator: t.operator,
				Function: t.function(t.variableName),
				'Semi Punctuation': t.punctuation,
				'( )': t.paren,
				'{ }': t.brace,
				'[ ]': t.squareBracket,
			}),
		],
	});
};

export const getParser = (dialect: Dialect) => {
	const sqlLangData = {
		commentTokens: { line: '--', block: { open: '/*', close: '*/' } },
		closeBrackets: { brackets: ['(', '[', '{', "'", '"', '`'] },
	};
	const sqlParser = getSqlParser().configure({
		tokenizers: [{ from: tokens, to: tokensFor(dialect) }],
	});
	const sqlLanguage = LRLanguage.define({
		name: 'sql',
		parser: sqlParser,
		languageData: sqlLangData,
	});

	const mixedParser = expressionParser.configure({
		wrap: parseMixed((node) => {
			return node.type.isTop
				? {
						parser: sqlLanguage.parser,
						overlay: (node) => node.type.name === 'Plaintext',
					}
				: null;
		}),
	});

	const mixedLanguage = LRLanguage.define({
		parser: mixedParser,
		name: 'expressionParser',
	});

	return { mixedLanguage, sqlLanguage };
};

/// Configuration for an [SQL Dialect](#lang-sql.SQLDialect).
export type SQLDialectSpec = {
	/// A space-separated list of keywords for the dialect.
	keywords?: string;
	/// A space-separated list of functions for the dialect.
	functions?: string;
	/// A space-separated string of built-in identifiers for the dialect.
	builtin?: string;
	/// A space-separated string of type names for the dialect.
	types?: string;
	/// Controls whether regular strings allow backslash escapes.
	backslashEscapes?: boolean;
	/// Controls whether # creates a line comment.
	hashComments?: boolean;
	/// Controls whether `//` creates a line comment.
	slashComments?: boolean;
	/// When enabled `--` comments are only recognized when there's a
	/// space after the dashes.
	spaceAfterDashes?: boolean;
	/// When enabled, things quoted with "$$" are treated as
	/// strings, rather than identifiers.
	doubleDollarQuotedStrings?: boolean;
	/// When enabled, things quoted with double quotes are treated as
	/// strings, rather than identifiers.
	doubleQuotedStrings?: boolean;
	/// Enables strings like `_utf8'str'` or `N'str'`.
	charSetCasts?: boolean;
	/// The set of characters that make up operators. Defaults to
	/// `"*+\-%<>!=&|~^/"`.
	operatorChars?: string;
	/// The set of characters that start a special variable name.
	/// Defaults to `"?"`.
	specialVar?: string;
	/// The characters that can be used to quote identifiers. Defaults
	/// to `"\""`.
	identifierQuotes?: string;
	/// Controls whether bit values can be defined as 0b1010. Defaults
	/// to false.
	unquotedBitLiterals?: boolean;
	/// Controls whether bit values can contain other characters than 0 and 1.
	/// Defaults to false.
	treatBitsAsBytes?: boolean;
};

/// Represents an SQL dialect.
export class SQLDialect {
	private constructor(
		/// @internal
		readonly dialect: Dialect,
		/// The mixed language for this dialect.
		readonly language: LRLanguage,
		/// The spec used to define this dialect.
		readonly spec: SQLDialectSpec,
		/// The sql language for this dialect.
		readonly sqlLanguage: LRLanguage,
	) {}

	/// Returns the language for this dialect as an extension.
	get extension() {
		return this.language.extension;
	}

	/// Define a new dialect.
	static define(spec: SQLDialectSpec) {
		const d = dialect(spec, spec.keywords, spec.types, spec.builtin, spec.functions);
		const { mixedLanguage, sqlLanguage } = getParser(d);
		const language = mixedLanguage;
		return new SQLDialect(d, language, spec, sqlLanguage);
	}
}

/// Options used to configure an SQL extension.
export interface SQLConfig {
	/// The [dialect](#lang-sql.SQLDialect) to use. Defaults to
	/// [`StandardSQL`](#lang-sql.StandardSQL).
	dialect?: SQLDialect;
	/// An object that maps table names, optionally prefixed with a
	/// schema name (`"schema.table"`) to options (columns) that can be
	/// completed for that table. Use lower-case names here.
	schema?: { [table: string]: ReadonlyArray<string | Completion> };
	/// By default, the completions for the table names will be
	/// generated from the `schema` object. But if you want to
	/// customize them, you can pass an array of completions through
	/// this option.
	tables?: readonly Completion[];
	/// Similar to `tables`, if you want to provide completion objects
	/// for your schemas rather than using the generated ones, pass them
	/// here.
	schemas?: readonly Completion[];
	/// When given, columns from the named table can be completed
	/// directly at the top level.
	defaultTable?: string;
	/// When given, tables prefixed with this schema name can be
	/// completed directly at the top level.
	defaultSchema?: string;
	/// When set to true, keyword completions will be upper-case.
	upperCaseKeywords?: boolean;
}

/// Returns a completion source that provides keyword completion for
/// the given SQL dialect.
export function keywordCompletionSource(dialect: SQLDialect, upperCase = false): CompletionSource {
	return completeKeywords(dialect.dialect.words, upperCase);
}

/// FIXME remove on 1.0 @internal
export function keywordCompletion(dialect: SQLDialect, upperCase = false): Extension {
	return dialect.sqlLanguage.data.of({
		autocomplete: keywordCompletionSource(dialect, upperCase),
	});
}

/// Returns a completion sources that provides schema-based completion
/// for the given configuration.
export function schemaCompletionSource(config: SQLConfig): CompletionSource {
	return config.schema
		? completeFromSchema(
				config.schema,
				config.tables,
				config.schemas,
				config.defaultTable,
				config.defaultSchema,
			)
		: () => null;
}

/// FIXME remove on 1.0 @internal
export function schemaCompletion(config: SQLConfig): Extension {
	return config.schema
		? (config.dialect || StandardSQL).sqlLanguage.data.of({
				autocomplete: schemaCompletionSource(config),
			})
		: [];
}

/// SQL language support for the given SQL dialect, with keyword
/// completion, and, if provided, schema-based completion as extra
/// extensions.
export function sql(config: SQLConfig = {}) {
	const lang = config.dialect || StandardSQL;
	return new LanguageSupport(lang.language, [
		schemaCompletion(config),
		keywordCompletion(lang, !!config.upperCaseKeywords),
	]);
}

/// The standard SQL dialect.
export const StandardSQL = SQLDialect.define({});

/// Dialect for [PostgreSQL](https://www.postgresql.org).
export const PostgreSQL = SQLDialect.define({
	charSetCasts: true,
	doubleDollarQuotedStrings: true,
	operatorChars: '+-*/<>=~!@#%^&|`?',
	specialVar: '',
	functions:
		SQLFunctions +
		'abs aggregate array_agg array_max_cardinality avg decode encode bernoulli cardinality ceil ceiling char_length character_length coalesce corr degrees substring system xmlcomment xmlvalidate xmlexists length strip lower upper bit_length normalize mod octet_length overlay ln sqrt power exp log lower',
	keywords:
		SQLKeywords +
		'abort absent access according ada admin alias also always analyse analyze asensitive assert assignment asymmetric atomic attach attribute attributes backward base64 begin_frame begin_partition bit_length blocked bom c cache called catalog_name chain character_set_catalog character_set_name character_set_schema characteristics characters checkpoint class class_origin cluster cobol collation_catalog collation_name collation_schema collect column_name columns command_function command_function_code comment comments committed concurrently condition_number configuration conflict connection_name constant constraint_catalog constraint_name constraint_schema contains content control conversion convert copy cost covar_pop covar_samp csv cume_dist current_catalog current_row current_schema cursor_name database datalink datatype datetime_interval_code datetime_interval_precision db debug defaults defined definer degree delimiter delimiters dense_rank depends derived detach detail dictionary disable discard dispatch dlnewcopy dlpreviouscopy dlurlcomplete dlurlcompleteonly dlurlcompletewrite dlurlpath dlurlpathonly dlurlpathwrite dlurlscheme dlurlserver dlvalue document dump dynamic_function dynamic_function_code element elsif empty enable encoding encrypted end_frame end_partition endexec enforced enum errcode error event every exclude excluding exclusive explain expression extension extract family file filter final first_value flag floor following force foreach fortran forward frame_row freeze fs functions fusion g generated granted greatest groups handler header hex hierarchy hint id ignore ilike immediately immutable implementation implicit import include including increment indent index indexes info inherit inherits inline insensitive instance instantiable instead integrity intersection invoker isnull k key_member key_type label lag last_value lead leakproof least length library like_regex link listen load location lock locked logged m mapping matched materialized max max_cardinality maxvalue member merge message message_length message_octet_length message_text min minvalue mode more move multiset mumps name namespace nfc nfd nfkc nfkd nil normalize normalized nothing notice notify notnull nowait nth_value ntile nullable nullif nulls number occurrences_regex octets off offset oids operator options ordering others over overriding owned owner p parallel parameter_mode parameter_name parameter_ordinal_position parameter_specific_catalog parameter_specific_name parameter_specific_schema parser partition pascal passing passthrough password percent percent_rank percentile_cont percentile_disc perform period permission pg_context pg_datatype_name pg_exception_context pg_exception_detail pg_exception_hint placing plans pli policy portion position position_regex precedes preceding prepared print_strict_params procedural procedures program publication query quote raise range rank reassign recheck recovery refresh regr_avgx regr_avgy regr_count regr_intercept regr_r2 regr_slope regr_sxx regr_sxy regr_syy reindex rename repeatable replace replica requiring reset respect restart restore result_oid returned_cardinality returned_length returned_octet_length returned_sqlstate returning reverse routine_catalog routine_name routine_schema routines row_count row_number rowtype rule scale schema_name schemas scope scope_catalog scope_name scope_schema security selective self sensitive sequence sequences serializable server server_name setof share show simple skip slice snapshot source specific_name sqlcode sqlerror stable stacked standalone statement statistics stddev_pop stddev_samp stdin stdout storage strict strip structure style subclass_origin submultiset subscription substring_regex succeeds sum symmetric sysid system system_time t table_name tables tablesample tablespace temp template ties token top_level_count transaction_active transactions_committed transactions_rolled_back transform transforms translate translate_regex trigger_catalog trigger_name trigger_schema trim trim_array truncate trusted type types uescape unbounded uncommitted unencrypted unlink unlisten unlogged unnamed untyped upper uri use_column use_variable user_defined_type_catalog user_defined_type_code user_defined_type_name user_defined_type_schema vacuum valid validate validator value_of var_pop var_samp varbinary variable_conflict variadic verbose version versioning views volatile warning whitespace width_bucket window within wrapper xmlagg xmlattributes xmlbinary xmlcast xmlcomment xmlconcat xmldeclaration xmldocument xmlelement xmlexists xmlforest xmliterate xmlnamespaces xmlparse xmlpi xmlquery xmlroot xmlschema xmlserialize xmltable xmltext xmlvalidate yes',
	types:
		SQLTypes +
		'bigint int8 bigserial serial8 varbit bool box bytea cidr circle precision float8 inet int4 json jsonb line lseg macaddr macaddr8 money numeric pg_lsn point polygon float4 int2 smallserial serial2 serial serial4 text timetz timestamptz tsquery tsvector txid_snapshot uuid xml',
});

const MySQLKeywords =
	'accessible algorithm analyze asensitive authors auto_increment autocommit avg avg_row_length binlog btree cache catalog_name chain change changed checkpoint checksum class_origin client_statistics coalesce code collations columns comment committed completion concurrent consistent contains contributors convert database databases day_hour day_microsecond day_minute day_second delay_key_write delayed delimiter des_key_file dev_pop dev_samp deviance directory disable discard distinctrow div dual dumpfile enable enclosed ends engine engines enum errors escaped even event events every explain extended fast field fields flush force found_rows fulltext grants handler hash high_priority hosts hour_microsecond hour_minute hour_second ignore ignore_server_ids import index index_statistics infile innodb insensitive insert_method install invoker iterate keys kill linear lines list load lock logs low_priority master master_heartbeat_period master_ssl_verify_server_cert masters max max_rows maxvalue message_text middleint migrate min min_rows minute_microsecond minute_second mod mode modify mutex mysql_errno no_write_to_binlog offline offset one online optimize optionally outfile pack_keys parser partition partitions password phase plugin plugins prev processlist profile profiles purge query quick range read_write rebuild recover regexp relaylog remove rename reorganize repair repeatable replace require resume rlike row_format rtree schedule schema_name schemas second_microsecond security sensitive separator serializable server share show slave slow snapshot soname spatial sql_big_result sql_buffer_result sql_cache sql_calc_found_rows sql_no_cache sql_small_result ssl starting starts std stddev stddev_pop stddev_samp storage straight_join subclass_origin sum suspend table_name table_statistics tables tablespace terminated triggers truncate uncommitted uninstall unlock upgrade use use_frm user_resources user_statistics utc_date utc_time utc_timestamp variables views warnings xa xor year_month zerofill';

const MySQLTypes =
	SQLTypes +
	'bool blob long longblob longtext medium mediumblob mediumint mediumtext tinyblob tinyint tinytext text bigint int1 int2 int3 int4 int8 float4 float8 varbinary varcharacter precision datetime unsigned signed';

const MySQLBuiltin =
	'charset clear edit ego help nopager notee nowarning pager print prompt quit rehash source status system tee';

/// [MySQL](https://dev.mysql.com/) dialect.
export const MySQL = SQLDialect.define({
	operatorChars: '*+-%<>!=&|^',
	charSetCasts: true,
	doubleQuotedStrings: true,
	unquotedBitLiterals: true,
	hashComments: true,
	spaceAfterDashes: true,
	specialVar: '@?',
	identifierQuotes: '`',
	functions: SQLFunctions,
	keywords: SQLKeywords + 'group_concat ' + MySQLKeywords,
	types: MySQLTypes,
	builtin: MySQLBuiltin,
});

/// Variant of [`MySQL`](#lang-sql.MySQL) for
/// [MariaDB](https://mariadb.org/).
export const MariaSQL = SQLDialect.define({
	operatorChars: '*+-%<>!=&|^',
	charSetCasts: true,
	doubleQuotedStrings: true,
	unquotedBitLiterals: true,
	hashComments: true,
	spaceAfterDashes: true,
	specialVar: '@?',
	identifierQuotes: '`',
	functions: SQLFunctions,
	keywords:
		SQLKeywords +
		'always generated groupby_concat hard persistent shutdown soft virtual ' +
		MySQLKeywords,
	types: MySQLTypes,
	builtin: MySQLBuiltin,
});

/// SQL dialect for Microsoft [SQL
/// Server](https://www.microsoft.com/en-us/sql-server).
export const MSSQL = SQLDialect.define({
	functions: SQLFunctions,
	keywords:
		SQLKeywords +
		'trigger proc view index for add constraint key primary foreign collate clustered nonclustered declare exec go if use index holdlock nolock nowait paglock pivot readcommitted readcommittedlock readpast readuncommitted repeatableread rowlock serializable snapshot tablock tablockx unpivot updlock with',
	types:
		SQLTypes +
		'bigint smallint smallmoney tinyint money real text nvarchar ntext varbinary image hierarchyid uniqueidentifier sql_variant xml',
	builtin:
		'binary_checksum checksum connectionproperty context_info current_request_id error_line error_message error_number error_procedure error_severity error_state formatmessage get_filestream_transaction_context getansinull host_id host_name isnull isnumeric min_active_rowversion newid newsequentialid rowcount_big xact_state object_id',
	operatorChars: '*+-%<>!=^&|/',
	specialVar: '@',
});

/// [SQLite](https://sqlite.org/) dialect.
export const SQLite = SQLDialect.define({
	functions: SQLFunctions + 'isnull notnull',
	keywords:
		SQLKeywords +
		'abort analyze attach autoincrement conflict database detach exclusive fail glob ignore index indexed instead offset plan pragma query raise regexp reindex rename replace temp vacuum virtual',
	types:
		SQLTypes +
		'bool blob long longblob longtext medium mediumblob mediumint mediumtext tinyblob tinyint tinytext text bigint int2 int8 unsigned signed real',
	builtin:
		'auth backup bail changes clone databases dbinfo dump echo eqp explain fullschema headers help import imposter indexes iotrace lint load log mode nullvalue once print prompt quit restore save scanstats separator shell show stats system tables testcase timeout timer trace vfsinfo vfslist vfsname width',
	operatorChars: '*+-%<>!=&|/~',
	identifierQuotes: '`"',
	specialVar: '@:?$',
});

/// Dialect for [Cassandra](https://cassandra.apache.org/)'s SQL-ish query language.
export const Cassandra = SQLDialect.define({
	functions:
		'to_timestamp to_unix_timestamp to_date cast abs round sqrt count sum max avg min log log10 now min_timeuuid max_timeuuid current_timestamp current_date current_time current_timeuuid',
	keywords:
		'add all allow alter and any apply as asc authorize batch begin by clustering columnfamily compact consistency count create custom delete desc distinct drop each_quorum exists filtering from grant if in index insert into key keyspace keyspaces level limit local_one local_quorum modify nan norecursive nosuperuser not of on one order password permission permissions primary quorum rename revoke schema select set storage superuser table three to token truncate ttl two type unlogged update use user users using values where with writetime infinity NaN',
	types:
		SQLTypes +
		'ascii bigint blob counter frozen inet list map static text timeuuid tuple uuid varint',
	slashComments: true,
});

/// [PL/SQL](https://en.wikipedia.org/wiki/PL/SQL) dialect.
export const PLSQL = SQLDialect.define({
	functions: SQLFunctions,
	keywords:
		SQLKeywords +
		'abort accept access add all alter and any arraylen as asc assert assign at attributes audit authorization avg base_table begin between binary_integer body by case cast char_base check close cluster clusters colauth column comment commit compress connected constant constraint crash create current currval cursor data_base database dba deallocate debugoff debugon declare default definition delay delete desc digits dispose distinct do drop else elseif elsif enable end entry exception exception_init exchange exclusive exists external fast fetch file for force form from function generic goto grant group having identified if immediate in increment index indexes indicator initial initrans insert interface intersect into is key level library like limited local lock log logging loop master maxextents maxtrans member minextents minus mislabel mode modify multiset new next no noaudit nocompress nologging noparallel not nowait number_base of off offline on online only option or order out package parallel partition pctfree pctincrease pctused pls_integer positive positiven pragma primary prior private privileges procedure public raise range raw rebuild record ref references refresh rename replace resource restrict return returning returns reverse revoke rollback row rowid rowlabel rownum rows run savepoint schema segment select separate set share snapshot some space split sql start statement storage subtype successful synonym tabauth table tables tablespace task terminate then to trigger truncate type union unique unlimited unrecoverable unusable update use using validate value values variable view views when whenever where while with work',
	builtin:
		'appinfo arraysize autocommit autoprint autorecovery autotrace blockterminator break btitle cmdsep colsep compatibility compute concat copycommit copytypecheck define echo editfile embedded feedback flagger flush heading headsep instance linesize lno loboffset logsource longchunksize markup native newpage numformat numwidth pagesize pause pno recsep recsepchar repfooter repheader serveroutput shiftinout show showmode spool sqlblanklines sqlcase sqlcode sqlcontinue sqlnumber sqlpluscompatibility sqlprefix sqlprompt sqlterminator suffix tab term termout timing trimout trimspool ttitle underline verify version wrap',
	types:
		SQLTypes +
		'ascii bfile bfilename bigserial bit blob dec long number nvarchar nvarchar2 serial smallint string text uid varchar2 xml',
	operatorChars: '*/+-%<>!=~',
	doubleQuotedStrings: true,
	charSetCasts: true,
});
