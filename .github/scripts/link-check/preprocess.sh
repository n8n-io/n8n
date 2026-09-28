#!/bin/sh
# Lychee checks the output of this script instead of the file.
#
# It keeps only lines where a URL is a link that a person follows: HTML and
# markdown links, doc link properties, comments, URLs in text, codex files, and
# locale files. It blanks all other lines, so line numbers stay correct. This
# skips API endpoints, OAuth URLs, base URLs, and placeholders in string values.
#
# It also expands docs URLs that the editor builds at runtime, and removes
# string escapes that lychee otherwise reads as part of a URL.
exec perl -e '
my $file = shift;
my $keep_all = $file =~ m{(\.node\.json|/locales/[^/]+\.json)$};
my $credential = $file =~ m{\.credentials\.ts$};
my $key = qr{(?:doc|docs|documentation|help|learn|guide|info|more|reference|support|pricing|terms|privacy|legal|page|article|blog|video|tutorial)\w*(?:url|uri|link|href)["\x27]?\s*[:=]}i;
my $link = qr{
	href= | \bto=["\x27] | \]\(https?:// | docs\.n8n\.io | DOCS_DOMAIN | $key
	| ^\s*(?://|\*|/\*) | \s//.*https?:// | <!--.*https?://
}xi;
# A URL after a word, such as "refer to https://...", unless the text is an example.
my $in_text = qr{[^\s"\x27\x60=(]\s+https?://};
my $example = qr{placeholder|e\.g\.|for example|if the url is|\bhint\s*:}i;
my $after_key = 0;
open my $fh, "<", $file or exit 0;
while (<$fh>) {
	s/\\"/"/g;
	s/\\n/ /g;
	if ($credential) {
		s{documentationUrl = \x27([\w/-]+)\x27}{documentationUrl = \x27https://docs.n8n.io/integrations/builtin/credentials/$1/\x27};
	} else {
		s/\$\{DOCS_DOMAIN\}/docs.n8n.io/g;
	}
	# The formatter can put the value of a doc link property on the next line.
	my $keep = $keep_all || $after_key || /$link/ || (/$in_text/ && !/$example/);
	$after_key = /$key\s*$/;
	print($keep ? $_ : "\n");
}' "$1"
