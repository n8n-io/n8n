#!/usr/bin/env bash
# Rank the use cases of one role for the user's tools and print the best three.
# usage: bash rank.sh <role id> <tool>...
# Output: a header, then one entry per line, best first, tab separated:
#   rank, title, template file (or -), tools, swaps, description
# swaps: `family (example) -> Tool`    = the user's tool replaces the example;
#        `... -> Tool [set NAME=k]`    = same, and the template holds a ready node
#                                       for it behind `const NAME = 'k'` (NOTIFY sends a
#                                       message or mail, INBOX reads a mailbox, SPREADSHEET
#                                       reads or writes rows);
#        `family (example) -> ?`       = the user has no tool of this family;
#        `none`                        = the entry runs on the user's tools as is.
# Tool names match case-insensitively, with or without a vendor prefix or a
# note in brackets: "Twilio (SMS)", "MS Teams", "Outlook 365", "a / b" all work.
# Score: +1 for a family the user has a tool for, -1 for a family the user has
# no tool for, 0 for built-in nodes. Ties keep the corpus rank.
# RANK_TOP=<n> prints n entries instead of three (for tests).
set -eu
[ $# -ge 2 ] || { echo "usage: bash rank.sh <role id> <tool>..." >&2; exit 2; }
dir=$(cd "$(dirname "$0")" && pwd)
role=$1
shift
file="$dir/$role.md"
[ -f "$file" ] || file="$dir/other.md"

printf 'rank\ttitle\ttemplate\ttools\tswaps\tdescription\n'
printf '%s\n' "$@" | awk -v dir="$dir" '
BEGIN {
	# The family table: which tools are interchangeable. `|` separates tools,
	# `/` separates the spellings of one tool (the first is its name). A tool
	# can sit in two families.
	fam["email"] = "gmail|microsoft outlook/outlook"
	fam["notification"] = "slack|microsoft teams/teams|gmail|microsoft outlook/outlook"
	fam["chat"] = "slack|microsoft teams/teams|discord|telegram"
	fam["CRM"] = "hubspot|pipedrive|salesforce|zoho crm/zoho"
	fam["spreadsheet"] = "google sheets/sheets|microsoft excel 365/excel/microsoft excel|airtable"
	fam["docs"] = "notion|google docs|coda"
	fam["issue tracker"] = "jira|linear|github issues|asana|trello|clickup"
	fam["help desk"] = "zendesk|freshdesk|intercom|help scout"
	fam["calendar"] = "google calendar|microsoft outlook calendar/outlook calendar"
	fam["file storage"] = "google drive|microsoft onedrive/onedrive|dropbox|box|aws s3/s3"
	fam["form"] = "typeform|jotform|google forms|n8n form|webflow"
	fam["database"] = "postgres/postgresql|mysql|supabase|mongodb/mongo|airtable|microsoft sql/sql server/mssql"
	fam["AI model"] = "openai/chatgpt|anthropic/claude|google gemini/gemini|mistral|ollama"
	fam["code hosting"] = "github|gitlab|bitbucket"
	fam["email marketing"] = "mailchimp|convertkit|brevo|activecampaign"
	fam["identity provider"] = "okta|auth0|microsoft entra id/entra/azure ad|jumpcloud"
	fam["user directory"] = "google workspace admin/google workspace|microsoft entra id/entra/azure ad|okta"
	fam["e-commerce"] = "shopify|woocommerce|magento|bigcommerce"
	fam["social"] = "x/twitter|reddit|linkedin|facebook|instagram|bluesky"
	fam["scheduling"] = "calendly|cal.com|acuity"
	fam["HR system"] = "bamboohr|personio|workday|hibob|rippling"
	fam["task manager"] = "todoist|asana|trello|clickup|microsoft to do"
	fam["payments"] = "stripe|paypal|paddle|chargebee"
	fam["incident alerting"] = "pagerduty|opsgenie|incident.io"
	fam["error tracking"] = "sentry|datadog|rollbar|bugsnag"
	fam["design tool"] = "figma|sketch"
	fam["data warehouse"] = "snowflake|google bigquery/bigquery|redshift|databricks"
	fam["accounting"] = "quickbooks|xero"
	fam["SMS"] = "twilio|vonage|messagebird"
	fam["app builder"] = "bubble|retool|softr|glide|appsmith"
	# The selector keys of the templates, by tool name, and the constant per family.
	key["slack"] = "slack"; key["microsoft teams"] = "teams"; key["gmail"] = "gmail"; key["microsoft outlook"] = "outlook"
	key["google sheets"] = "sheets"; key["microsoft excel 365"] = "excel"
	sel["notification"] = "NOTIFY"; sel["email"] = "INBOX"; sel["spreadsheet"] = "SPREADSHEET"
	for (f in fam) {
		n = split(fam[f], groups, /\|/)
		for (i = 1; i <= n; i++) {
			m = split(groups[i], syn, "/")
			for (j = 1; j <= m; j++) canon[syn[j]] = syn[1]
			famof[syn[1]] = famof[syn[1]] f "|"
		}
	}
}
# First input: one user tool per line. Try the label, the text before and
# inside brackets, and each part of a "/" or "," list.
NR == FNR {
	label = $0; gsub(/^[ \t]+|[ \t]+$/, "", label)
	if (label == "") next
	c = tolower(label); n = 0; cand[++n] = c
	if (match(c, /\([^()]*\)/)) { cand[++n] = substr(c, 1, RSTART - 1); cand[++n] = substr(c, RSTART + 1, RLENGTH - 2) }
	m = split(c, parts, /[\/,]/)
	if (m > 1) for (i = 1; i <= m; i++) cand[++n] = parts[i]
	for (i = 1; i <= n; i++) { t = cand[i]; gsub(/^[ \t]+|[ \t]+$/, "", t); if (t != "") claim(t, label) }
	next
}
# Second input: the role file.
/^## [0-9]+\. / {
	flush()
	rank = $0; sub(/^## /, "", rank); sub(/\. .*$/, "", rank)
	title = $0; sub(/^## [0-9]+\. /, "", title)
	tools = ""; tmpl = "-"; desc = ""; inentry = 1
	next
}
inentry && /^- Tools: / { tools = substr($0, 10); next }
inentry && /^- Template: / { tmpl = substr($0, 13); next }
inentry && /^- / { next }
inentry && desc == "" && $0 !~ /^[ \t]*$/ { desc = $0; next }
END { flush() }

function claim(t, label,   s) {
	usertool[t] = 1
	if (t in canon) { take(canon[t], label); return }
	# Not a known spelling: any known spelling as a whole word inside the text.
	for (s in canon) if (index(" " t " ", " " s " ") > 0) take(canon[s], label)
}

function take(name, label,   k, fl, i) {
	usertool[name] = 1
	k = split(famof[name], fl, /\|/)
	for (i = 1; i <= k; i++) if (fl[i] != "" && !(fl[i] in have)) { have[fl[i]] = label; havename[fl[i]] = name }
}

# Whether the template of the entry holds the line const NAME = <key>, the selector of a family.
function hasconst(name,   path, line, found) {
	if (tmpl == "-") return 0
	path = dir "/" tmpl; found = 0
	while ((getline line < path) > 0) if (line ~ ("^const " name " = \047")) found = 1
	close(path)
	return found
}

function flush(   n, i, item, f, e, s, sw) {
	if (!inentry) return
	s = 0; sw = ""
	n = split(tools, items, ", ")
	for (i = 1; i <= n; i++) {
		item = items[i]
		if (match(item, / \(.*\)$/)) {
			f = substr(item, 1, RSTART - 1)
			e = tolower(substr(item, RSTART + 2, RLENGTH - 3))
			if (e in canon) e = canon[e]
			if (e in usertool) s++
			else if (f in have) {
				s++
				sw = sw (sw == "" ? "" : "; ") item " -> " have[f]
				if ((f in sel) && (havename[f] in key) && hasconst(sel[f])) sw = sw " [set " sel[f] "=" key[havename[f]] "]"
			} else { s--; sw = sw (sw == "" ? "" : "; ") item " -> ?" }
		}
	}
	printf "%d\t%d\t%s\t%s\t%s\t%s\t%s\n", s, rank, title, tmpl, tools, (sw == "" ? "none" : sw), desc
	inentry = 0
}
' - "$file" | sort -t "$(printf '\t')" -k1,1nr -k2,2n | head -n "${RANK_TOP:-3}" | cut -f 2-
