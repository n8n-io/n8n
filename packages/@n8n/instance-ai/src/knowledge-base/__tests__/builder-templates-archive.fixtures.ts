import { gzipSync } from 'node:zlib';

export type BuilderTemplatesTarEntry = {
	name: string;
	content?: string;
	typeFlag?: string;
	linkName?: string;
};

function writeTarOctal(buffer: Buffer, offset: number, length: number, value: number): void {
	const octal = value
		.toString(8)
		.padStart(length - 1, '0')
		.slice(-(length - 1));
	buffer.write(octal, offset, length - 1, 'ascii');
	buffer[offset + length - 1] = 0;
}

function writeTarChecksum(buffer: Buffer, checksum: number): void {
	const octal = checksum.toString(8).padStart(6, '0').slice(-6);
	buffer.write(octal, 148, 6, 'ascii');
	buffer[154] = 0;
	buffer[155] = 0x20;
}

/** Build a gzip-wrapped tar archive matching the n8n-sdk-templates bundle shape. */
export function makeBuilderTemplatesTarGz(entries: BuilderTemplatesTarEntry[]): Buffer {
	const blocks: Buffer[] = [];
	for (const entry of entries) {
		const content = Buffer.from(entry.content ?? '', 'utf-8');
		const typeFlag = entry.typeFlag ?? '0';
		const size = typeFlag === '0' ? content.byteLength : 0;
		const header = Buffer.alloc(512);

		header.write(entry.name, 0, 100, 'utf-8');
		writeTarOctal(header, 100, 8, 0o644);
		writeTarOctal(header, 108, 8, 0);
		writeTarOctal(header, 116, 8, 0);
		writeTarOctal(header, 124, 12, size);
		writeTarOctal(header, 136, 12, 0);
		header.fill(0x20, 148, 156);
		header.write(typeFlag, 156, 1, 'ascii');
		if (entry.linkName) header.write(entry.linkName, 157, 100, 'utf-8');
		header.write('ustar', 257, 5, 'ascii');
		header.write('00', 263, 2, 'ascii');

		const checksum = header.reduce((sum, byte) => sum + byte, 0);
		writeTarChecksum(header, checksum);
		blocks.push(header);

		if (size > 0) {
			blocks.push(content);
			const padding = (512 - (size % 512)) % 512;
			if (padding > 0) blocks.push(Buffer.alloc(padding));
		}
	}
	blocks.push(Buffer.alloc(1024));
	return gzipSync(Buffer.concat(blocks));
}
