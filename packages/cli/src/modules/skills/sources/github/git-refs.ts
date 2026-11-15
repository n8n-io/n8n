// The `ls-refs` command of the git protocol v2 over smart HTTP, as `git ls-remote` sends it.
// It lists the branches and the default branch in one request. It does not use the GitHub
// REST API, so the REST rate limit does not apply.

/** The branches of a repository and its default branch. */
export type GitRefs = {
	/** The branch that HEAD points to. Undefined for an empty repository. */
	defaultBranch: string | undefined;
	/** Commit of each branch, by branch name without `refs/heads/`. */
	branches: Map<string, string>;
};

const BRANCH_PREFIX = 'refs/heads/';

/** The request body: `ls-refs` for HEAD and every branch, with symrefs. */
export function lsRefsRequestBody(): Buffer {
	return Buffer.from(
		pktLine('command=ls-refs\n') +
			'0001' +
			pktLine('symrefs\n') +
			pktLine(`ref-prefix ${BRANCH_PREFIX}\n`) +
			pktLine('ref-prefix HEAD\n') +
			'0000',
	);
}

/** Reads the answer to `lsRefsRequestBody`. Throws on a body that is not pkt-lines. */
export function parseLsRefsResponse(body: Buffer): GitRefs {
	const branches = new Map<string, string>();
	let defaultBranch: string | undefined;
	for (const line of readPktLines(body)) {
		// `<sha> <ref>[ symref-target:<target>]`
		const [sha, ref, ...attributes] = line.trimEnd().split(' ');
		if (!sha || !ref || !/^[0-9a-f]{40,64}$/.test(sha)) continue;
		if (ref === 'HEAD') {
			const target = attributes.find((attribute) => attribute.startsWith('symref-target:'));
			const name = target?.slice('symref-target:'.length);
			if (name?.startsWith(BRANCH_PREFIX)) defaultBranch = name.slice(BRANCH_PREFIX.length);
		} else if (ref.startsWith(BRANCH_PREFIX)) {
			branches.set(ref.slice(BRANCH_PREFIX.length), sha);
		}
	}
	return { defaultBranch, branches };
}

/** A git pkt-line: four hex digits for the length, the length included, then the data. */
export function pktLine(data: string): string {
	return (Buffer.byteLength(data) + 4).toString(16).padStart(4, '0') + data;
}

function readPktLines(body: Buffer): string[] {
	const lines: string[] = [];
	let offset = 0;
	while (offset < body.length) {
		const header = body.subarray(offset, offset + 4).toString('ascii');
		if (!/^[0-9a-f]{4}$/i.test(header)) throw new Error('Not a git pkt-line answer');
		const length = Number.parseInt(header, 16);
		// 0000 flush, 0001 delimiter, 0002 response end: no data. 0003 is not a valid length.
		if (length < 3) {
			offset += 4;
			continue;
		}
		if (length === 3 || offset + length > body.length) {
			throw new Error('Not a git pkt-line answer');
		}
		lines.push(body.subarray(offset + 4, offset + length).toString('utf8'));
		offset += length;
	}
	return lines;
}
