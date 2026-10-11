const WEBSITE_BUILD_REQUEST =
	/\b(website|web\s*site|landing page|web\s?app|web\s?page|webpage|home\s?page|code mode)\b/i;

const BUILD_A_SITE_REQUEST = /\b(make|build|create|design)\b[\s\S]{0,40}\bsite\b/i;

/** A chat request that should open code mode. */
export function isWebsiteBuildRequest(text: string): boolean {
	return WEBSITE_BUILD_REQUEST.test(text) || BUILD_A_SITE_REQUEST.test(text);
}

export function codeModeStorageKey(threadId: string): string {
	return `n8n-instance-ai-code-mode:${threadId}`;
}

export function writeCodeMode(threadId: string): void {
	sessionStorage.setItem(codeModeStorageKey(threadId), '1');
}

export function readCodeMode(threadId: string): boolean {
	return sessionStorage.getItem(codeModeStorageKey(threadId)) === '1';
}

export const CODE_MODE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Site draft</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <main>
    <p class="eyebrow">Draft</p>
    <h1>Your website</h1>
    <p>This page is open in code mode. Ask the assistant to change the headline, the sections, or the layout.</p>
    <a href="#start">Start here</a>
  </main>
</body>
</html>
`;

export const CODE_MODE_CSS = `body {
  margin: 0;
  font-family: Georgia, serif;
  background: #f6f3ee;
  color: #1c1917;
}
main {
  max-width: 36rem;
  margin: 0 auto;
  padding: 4rem 1.5rem;
}
.eyebrow {
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-size: 0.75rem;
}
h1 {
  font-size: 2.5rem;
  line-height: 1.1;
  margin: 0.5rem 0 1rem;
}
a {
  color: #9a3412;
}
`;

export const CODE_MODE_PREVIEW_DOCUMENT = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Site draft</title>
  <style>${CODE_MODE_CSS}</style>
</head>
<body>
  <main>
    <p class="eyebrow">Draft</p>
    <h1>Your website</h1>
    <p>This page is open in code mode. Ask the assistant to change the headline, the sections, or the layout.</p>
    <a href="#start">Start here</a>
  </main>
</body>
</html>
`;
