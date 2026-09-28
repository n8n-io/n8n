#!/bin/sh
# Lychee checks the output of this script instead of the file.
#
# It keeps only lines where a URL is a link that a person follows: HTML and
# markdown links, doc link properties, comments, codex files, and locale files.
# It blanks all other lines, so line numbers stay correct. This skips API
# endpoints, OAuth URLs, base URLs, and placeholders in string values.
#
# It also expands docs URLs that the editor builds at runtime, and removes
# string escapes that lychee otherwise reads as part of a URL.
exec perl -e '
my $file = shift;
my $keep_all = $file =~ m{(\.node\.json|/locales/[^/]+\.json)$};
my $credential = $file =~ m{\.credentials\.ts$};
my $link = qr{
	href= | \]\(https?:// | docs\.n8n\.io | DOCS_DOMAIN
	| (?:doc|docs|documentation|help|learn|guide|info|more|reference|support|pricing|terms|privacy|legal|page|article|blog|video|tutorial)\w*(?:url|uri|link|href)["\x27]?\s*[:=]
	| ^\s*(?://|\*|/\*) | \s//.*https?:// | <!--.*https?://
}xi;
open my $fh, "<", $file or exit 0;
while (<$fh>) {
	s/\\"/"/g;
	s/\\n/ /g;
	if ($credential) {
		s{documentationUrl = \x27([\w/-]+)\x27}{documentationUrl = \x27https://docs.n8n.io/integrations/builtin/credentials/$1/\x27};
	} else {
		s/\$\{DOCS_DOMAIN\}/docs.n8n.io/g;
	}
	print(($keep_all || /$link/) ? $_ : "\n");
}' "$1"
