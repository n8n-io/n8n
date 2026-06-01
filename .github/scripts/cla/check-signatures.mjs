// Invoked from .github/workflows/ci-cla-check.yml via actions/github-script.
//
// Collects unique commit authors for the PR (or for the commits a merge
// queue is about to land) and asks the n8n CLA service whether each one
// has signed. Surfaces three buckets to subsequent steps:
//   - signed   : verified contributors
//   - unsigned : verified non-contributors (block the merge)
//   - errored  : CLA lookup failed (block the merge — fail-closed so we
//                never green-light an unverified contribution)
//
// Commits whose author email is not linked to a GitHub account can't be
// looked up by login; they're surfaced separately as `unlinked`.

/**
 * @typedef { InstanceType<typeof import("@actions/github/lib/utils").GitHub> } GitHubInstance
 * @typedef { import("@actions/github/lib/context").Context } Context
 * @typedef { typeof import("@actions/core") } Core
 */

/**
 * @param {{ github: GitHubInstance, context: Context, core: Core }} params
 */
export default async function checkSignatures ({ github, context, core }) {
	const { owner, repo } = context.repo;
	const prNumber = process.env.PR_NUMBER;
	const headSha = process.env.HEAD_SHA;
	const baseSha = process.env.BASE_SHA;
	const isMergeGroup = process.env.IS_MERGE_GROUP === 'true';

	/** @type {Set<string>} */
	const authors = new Set();
	/** @type {Array<{sha: string, name: string, email: string}>} */
	const unlinkedCommits = [];

	/**
	 * @param {Array<any>} commits
	 */
	const collect = (commits) => {
		for (const c of commits) {
			// Bot-authored commits don't need a CLA; skip before the linked/unlinked split
			// so they don't fall through to `unlinkedCommits` and fail `all_signed`.
			if (c.author && c.author.type === 'Bot') continue;

			if (c.author && c.author.login) {
				authors.add(c.author.login);
			} else if (c.commit && c.commit.author) {
				unlinkedCommits.push({
					sha: c.sha,
					name: c.commit.author.name,
					email: c.commit.author.email,
				});
			}
		}
	};

	if (isMergeGroup) {
		const { data: comparison } = await github.rest.repos.compareCommitsWithBasehead({
			owner,
			repo,
			basehead: `${baseSha}...${headSha}`,
		});
		collect(comparison.commits || []);
	} else if (prNumber) {
		const commits = await github.paginate(github.rest.pulls.listCommits, {
			owner,
			repo,
			pull_number: Number(prNumber),
			per_page: 100,
		});
		collect(commits);
	}

	const loginList = [...authors];
	core.info(`Contributors to check: ${loginList.join(', ') || '(none)'}`);
	if (unlinkedCommits.length > 0) {
		core.warning(
			`${unlinkedCommits.length} commit(s) have an author email not linked to a GitHub account ` +
				'and cannot be verified against the CLA service.',
		);
	}

	/** @type {string[]} */
	const signed = [];
	/** @type {string[]} */
	const unsigned = [];
	/** @type {string[]} */
	const errored = [];

	for (const login of loginList) {
		const url = `${process.env.CLA_API}?checkContributor=${encodeURIComponent(login)}`;
		try {
			const res = await fetch(url);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data = await res.json();
			if (data && data.isContributor === true) {
				signed.push(login);
			} else {
				unsigned.push(login);
			}
		} catch (e) {
			core.warning(`CLA lookup failed for @${login}: ${e instanceof Error ? e.message : String(e)}`);
			errored.push(login);
		}
	}

	const blocking = [...unsigned, ...errored];
	const allSigned = blocking.length === 0 && unlinkedCommits.length === 0;

	core.setOutput('signed', signed.join(','));
	core.setOutput('unsigned', unsigned.join(','));
	core.setOutput('errored', errored.join(','));
	core.setOutput('unlinked', JSON.stringify(unlinkedCommits));
	core.setOutput('all_signed', String(allSigned));
}
