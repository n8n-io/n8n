#!/usr/bin/env bash
# Rank the use cases of one role for the user's tools and print the best three.
# usage: bash rank.sh <role id> <tool>...
# Output: a header, then one entry per line, best first, tab separated:
#   rank, title, template file (or -), tools, swaps, description
# swaps: `family (example) -> Tool` = the user's tool replaces the example;
#        `family (example) -> ?`    = the user has no tool of this family;
#        `none`                     = the entry runs on the user's tools as is.
# Score: +1 for a family the user has a tool for, -1 for a family the user has
# no tool for, 0 for built-in nodes. Ties keep the corpus rank.
set -eu
[ $# -ge 2 ] || { echo "usage: bash rank.sh <role id> <tool>..." >&2; exit 2; }
dir=$(cd "$(dirname "$0")" && pwd)
role=$1
shift
file="$dir/$role.md"
[ -f "$file" ] || file="$dir/other.md"

printf 'rank\ttitle\ttemplate\ttools\tswaps\tdescription\n'
printf '%s\n' "$@" | awk '
BEGIN {
	# The family table: which tools are interchangeable. A tool can sit in two families.
	fam["email"] = "gmail|microsoft outlook|outlook"
	fam["notification"] = "slack|microsoft teams|teams|gmail|microsoft outlook|outlook"
	fam["chat"] = "slack|microsoft teams|teams|discord|telegram"
	fam["CRM"] = "hubspot|pipedrive|salesforce|zoho crm"
	fam["spreadsheet"] = "google sheets|microsoft excel 365|excel|airtable"
	fam["docs"] = "notion|google docs|coda"
	fam["issue tracker"] = "jira|linear|github issues|asana|trello|clickup"
	fam["help desk"] = "zendesk|freshdesk|intercom|help scout"
	fam["calendar"] = "google calendar|microsoft outlook calendar|outlook calendar"
	fam["file storage"] = "google drive|microsoft onedrive|onedrive|dropbox|box|aws s3|s3"
	fam["form"] = "typeform|jotform|google forms|n8n form"
	fam["database"] = "postgres|postgresql|mysql|supabase|mongodb|airtable"
	fam["AI model"] = "openai|anthropic|claude|google gemini|gemini|mistral|ollama"
	fam["code hosting"] = "github|gitlab|bitbucket"
	fam["email marketing"] = "mailchimp|convertkit|brevo|activecampaign"
	# Families that appear in the corpus but had no row in the old skill table.
	fam["identity provider"] = "okta|auth0|microsoft entra id|entra|azure ad|jumpcloud"
	fam["user directory"] = "google workspace admin|google workspace|microsoft entra id|entra|azure ad|okta"
	fam["e-commerce"] = "shopify|woocommerce|magento|bigcommerce"
	fam["social"] = "x|twitter|reddit|linkedin|facebook|instagram|bluesky"
	fam["scheduling"] = "calendly|cal.com|acuity"
	fam["HR system"] = "bamboohr|personio|workday|hibob|rippling"
	fam["task manager"] = "todoist|asana|trello|clickup|microsoft to do"
	fam["payments"] = "stripe|paypal|paddle|chargebee"
	fam["incident alerting"] = "pagerduty|opsgenie|incident.io"
	fam["error tracking"] = "sentry|datadog|rollbar|bugsnag"
	fam["design tool"] = "figma|sketch"
	fam["data warehouse"] = "snowflake|google bigquery|bigquery|redshift|databricks"
	fam["accounting"] = "quickbooks|xero"
	fam["SMS"] = "twilio|vonage|messagebird"
}
# First input: one user tool per line.
NR == FNR {
	tool = tolower($0)
	gsub(/^[ \t]+|[ \t]+$/, "", tool)
	if (tool == "") next
	usertool[tool] = 1
	for (f in fam) if (index("|" fam[f] "|", "|" tool "|") > 0 && !(f in have)) have[f] = $0
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

function flush(   n, i, item, f, e, s, sw) {
	if (!inentry) return
	s = 0; sw = ""
	n = split(tools, items, ", ")
	for (i = 1; i <= n; i++) {
		item = items[i]
		if (match(item, / \(.*\)$/)) {
			f = substr(item, 1, RSTART - 1)
			e = tolower(substr(item, RSTART + 2, RLENGTH - 3))
			if (e in usertool) s++
			else if (f in have) { s++; sw = sw (sw == "" ? "" : "; ") item " -> " have[f] }
			else { s--; sw = sw (sw == "" ? "" : "; ") item " -> ?" }
		} else if (tolower(item) in usertool) s++
	}
	printf "%d\t%d\t%s\t%s\t%s\t%s\t%s\n", s, rank, title, tmpl, tools, (sw == "" ? "none" : sw), desc
	inentry = 0
}
' - "$file" | sort -t "$(printf '\t')" -k1,1nr -k2,2n | head -n 3 | cut -f 2-
