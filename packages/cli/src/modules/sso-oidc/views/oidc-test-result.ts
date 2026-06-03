const PAGE_STYLES = `
body { background: rgb(251,252,254); font-family: 'Open Sans', sans-serif; padding: 10px; margin: auto; max-width: 700px; }
h1 { font-size: 16px; font-weight: 400; margin: 0 0 10px 0; }
h2 { color: rgb(0, 0, 0); font-size: 12px; font-weight: 400; margin: 0 0 10px 0; }
button { border: 1px solid rgb(219, 223, 231); background: rgb(255, 255, 255); border-radius: 4px; padding: 10px; cursor: pointer; font: inherit; }
ul { border: 1px solid rgb(219, 223, 231); border-radius: 4px; padding: 10px; }
li { list-style: none; margin: 0; color: rgb(125, 125, 125); font-size: 12px; }
details { margin-top: 24px; text-align: left; border: 1px solid rgb(219, 223, 231); border-radius: 4px; padding: 8px 12px; }
summary { cursor: pointer; font-size: 12px; color: rgb(70, 70, 70); padding: 4px 0; }
.claims-section { margin-top: 12px; }
.claims-section h3 { font-size: 12px; font-weight: 600; margin: 0 0 6px 0; color: rgb(0, 0, 0); }
.claims-section pre { background: white; border: 1px solid rgb(219, 223, 231); border-radius: 4px; padding: 10px; margin: 0; max-height: 320px; overflow: auto; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; white-space: pre; }
.claims-warning { color: rgb(125, 125, 125); font-size: 11px; margin: 0 0 12px 0; }
`;

function escapeHtml(value: unknown): string {
	return String(value ?? '(n/a)')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

function renderClaimsSection(label: string, payload: Record<string, unknown>): string {
	const json = JSON.stringify(payload, null, 2);
	return `
	<div class="claims-section">
		<h3>${escapeHtml(label)}</h3>
		<pre>${escapeHtml(json)}</pre>
	</div>`;
}

export function renderOidcTestSuccess({
	claims,
	userInfo,
}: {
	claims: Record<string, unknown>;
	userInfo: Record<string, unknown>;
}): string {
	const email = escapeHtml(userInfo.email);
	const firstName = escapeHtml(userInfo.given_name);
	const lastName = escapeHtml(userInfo.family_name);
	const sub = escapeHtml(userInfo.sub);

	return `<!DOCTYPE html>
<html>
<head><title>n8n - OIDC Connection Test Result</title><style>${PAGE_STYLES}h1 { color: rgb(0, 0, 0); }</style></head>
<body>
<div style="text-align:center">
	<h1>OIDC Connection Test was successful</h1>
	<button onclick="window.close()">You can close this window now</button>
	<p></p>
	<h2>Here are the attributes returned by your OIDC provider:</h2>
	<ul>
		<li><strong>Email:</strong> ${email}</li>
		<li><strong>First Name:</strong> ${firstName}</li>
		<li><strong>Last Name:</strong> ${lastName}</li>
		<li><strong>Subject:</strong> ${sub}</li>
	</ul>
	<details>
		<summary>Show full claims (for debugging role mapping)</summary>
		<p class="claims-warning">Contains identity data from your IdP. Avoid sharing publicly.</p>
		${renderClaimsSection('ID token claims', claims)}
		${renderClaimsSection('Userinfo endpoint response', userInfo)}
	</details>
</div>
</body>
</html>`;
}

export function renderOidcTestFailure(error: unknown): string {
	const message = escapeHtml(error instanceof Error ? error.message : String(error));

	return `<!DOCTYPE html>
<html>
<head><title>n8n - OIDC Connection Test Result</title><style>${PAGE_STYLES}h1 { color: rgb(240, 60, 60); }</style></head>
<body>
<div style="text-align:center">
	<h1>OIDC Connection Test failed</h1>
	<h2>${message}</h2>
	<button onclick="window.close()">You can close this window now</button>
</div>
</body>
</html>`;
}
