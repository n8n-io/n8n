// Invoked from .github/workflows/ci-cla-check.yml via actions/github-script.
//
// Maintains a single CLA comment per PR, keyed by an HTML marker so the
// same comment is edited in place across re-runs instead of spammed.
// A clean PR that has never been flagged gets no comment at all — only
// PRs that needed a nudge get the eventual "thanks" follow-up.

/**
 * @typedef { InstanceType<typeof import("@actions/github/lib/utils").GitHub> } GitHubInstance
 * @typedef { import("@actions/github/lib/context").Context } Context
 * @typedef { typeof import("@actions/core") } Core
 */

/**
 * @param {{ github: GitHubInstance, context: Context, core: Core }} params
 */
export default async function updatePRComment({ github, context }) {
	const { owner, repo } = context.repo;
	const issue_number = Number(process.env.PR_NUMBER);
	const allSigned = process.env.ALL_SIGNED === 'true';
	const unsigned = (process.env.UNSIGNED ?? '').split(',').filter(Boolean);
	const errored = (process.env.ERRORED ?? '').split(',').filter(Boolean);
	const unlinked = JSON.parse(process.env.UNLINKED || '[]');
	const MARKER = /** @type {string} */ (process.env.COMMENT_MARKER);

	const comments = await github.paginate(github.rest.issues.listComments, {
		owner,
		repo,
		issue_number,
		per_page: 100,
	});
	// Only adopt the comment as ours if it's bot-authored — otherwise a user
	// who copies our marker into their own comment would either hijack the
	// thread or make updateComment 403 with insufficient permissions.
	const existing = comments.find(
		(c) => c.body && c.body.includes(MARKER) && c.user && c.user.type === 'Bot',
	);

	let body;
	if (allSigned) {
		// Only leave a "thanks" trail if we already nudged once. Avoids
		// pinging every clean PR with a CLA comment.
		if (!existing) {
			return;
		}

		body = [
			MARKER,
			'✅ **CLA Check passed.** All contributors on this PR have signed the n8n CLA — thank you!',
		].join('\n');
	} else {
		const lines = [MARKER, '## CLA signatures required', ''];
		lines.push(`Thank you for your submission! We really appreciate it.
Like many open source projects, we ask that you sign our [Contributor License Agreement](${process.env.CLA_SIGN_URL}) before we can accept your contribution.`);
		lines.push('');

		if (unsigned.length > 0) {
			lines.push('**Contributors who still need to sign:**');
			for (const u of unsigned) {
				lines.push(`- @${u}`);
			}
			lines.push('');
		}
		if (errored.length > 0) {
			lines.push('**Could not verify (will retry on next push):**');
			for (const u of errored) {
				lines.push(`- @${u}`);
			}
			lines.push('');
		}
		if (unlinked.length > 0) {
			lines.push('**Commits authored by an email not linked to a GitHub account:**');
			for (const c of unlinked) {
				lines.push(`- \`${c.sha.slice(0, 7)}\` — ${c.name} <${c.email}>`);
			}
			lines.push('');
			lines.push(
				'Add the email to your GitHub account ' +
					'([instructions](https://docs.github.com/account-and-profile/setting-up-and-managing-your-personal-account-on-github/managing-email-preferences/adding-an-email-address-to-your-github-account)) ' +
					'or amend the commits to use a linked email, then push again.',
			);
			lines.push('');
		}

		lines.push('Once signed, comment `/cla-check` on this PR to re-run verification.');
		body = lines.join('\n');
	}

	if (existing) {
		await github.rest.issues.updateComment({
			owner,
			repo,
			comment_id: existing.id,
			body,
		});
	} else {
		await github.rest.issues.createComment({
			owner,
			repo,
			issue_number,
			body,
		});
	}
}
