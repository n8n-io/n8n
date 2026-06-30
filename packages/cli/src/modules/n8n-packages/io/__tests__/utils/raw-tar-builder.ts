import { Header, type types } from 'tar';

type EntryTypeName = types.EntryTypeName;

const BLOCK_SIZE = 512;
const FIXED_MTIME = new Date(0);

export interface RawTarEntry {
	path: string;
	type?: EntryTypeName;
	content?: string | Buffer;
	mode?: number;
	linkpath?: string;
}

function entryBlocks(entry: RawTarEntry): Buffer {
	const type = entry.type ?? 'File';
	const content =
		type === 'Directory' || entry.content === undefined
			? Buffer.alloc(0)
			: typeof entry.content === 'string'
				? Buffer.from(entry.content, 'utf-8')
				: entry.content;

	const header = new Header({
		path: entry.path,
		type,
		size: content.length,
		mode: entry.mode,
		mtime: FIXED_MTIME,
		linkpath: entry.linkpath,
	});
	header.encode();
	const headerBlock = header.block;
	if (!headerBlock) throw new Error('tar header failed to encode');

	if (content.length === 0) return headerBlock;
	const data = Buffer.alloc(Math.ceil(content.length / BLOCK_SIZE) * BLOCK_SIZE);
	content.copy(data);
	return Buffer.concat([headerBlock, data]);
}

/**
 * Builds a tar archive from raw entries with node-tar's `Header` encoder,
 * bypassing the path sanitising and typeflag filtering that `TarPackageWriter`'s
 * `Pack` applies — so tests can hand the reader the exact malformed entries
 * they need to probe its defenses.
 */
export function buildRawTar(entries: RawTarEntry[]): Buffer {
	const blocks = entries.map(entryBlocks);
	// A tar archive terminates with two zero blocks.
	blocks.push(Buffer.alloc(BLOCK_SIZE * 2));
	return Buffer.concat(blocks);
}
