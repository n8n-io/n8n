const PAGE_STYLES = `
body { background: rgb(251,252,254); font-family: 'Open Sans', sans-serif; padding: 10px; margin: auto; width: 500px; top: 40%; position: relative; }
h1 { font-size: 16px; font-weight: 400; margin: 0 0 10px 0; }
h2 { color: rgb(0, 0, 0); font-size: 12px; font-weight: 400; margin: 0 0 10px 0; }
button { border: 1px solid rgb(219, 223, 231); background: rgb(255, 255, 255); border-radius: 4px; padding: 10px; cursor: pointer; }
ul { border: 1px solid rgb(219, 223, 231); border-radius: 4px; padding: 10px; }
li { list-style: none; margin: 0; color: rgb(125, 125, 125); font-size: 12px; }
`;

function escapeHtml(value: unknown): string {
	return String(value ?? '(n/a)')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

export function renderOidcTestSuccess({
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
