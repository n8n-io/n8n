/**
 * Pre-approved documentation domains for the web fetch tool.
 *
 * URLs on these domains skip the user-approval interrupt because they are
 * well-known, public documentation sites for services that n8n integrates
 * with, or widely-used developer reference material.
 *
 * Keep this list sorted alphabetically within each section.
 */

// ── AI / LLM ────────────────────────────────────────────────────────────────

const AI_DOCS = [
	'code.claude.com',
	'console.groq.com',
	'developers.deepl.com',
	'docs.cohere.com',
	'docs.firecrawl.dev',
	'docs.mistral.ai',
	'docs.perplexity.ai',
	'docs.x.ai',
	'elevenlabs.io',
	'modelcontextprotocol.io',
	'ollama.com',
	'openrouter.ai',
	'platform.claude.com',
	'platform.deepseek.com',
	'platform.openai.com',
	'developers.openai.com',
] as const;

// ── Cloud, Hosting & DevOps ─────────────────────────────────────────────────

const CLOUD_DOCS = [
	'cypress.io',
	'devcenter.heroku.com',
	'developer.hashicorp.com',
	'docs.aws.amazon.com',
	'docs.netlify.com',
	'cloud.google.com',
	'kubernetes.io',
	'selenium.dev',
	'vercel.com',
] as const;

// ── Communication & Messaging ───────────────────────────────────────────────

const COMMUNICATION_DOCS = [
	'api.mattermost.com',
	'api.slack.com',
	'core.telegram.org',
	'developer.vonage.com',
	'developers.facebook.com',
	'developers.line.biz',
	'discord.com',
	'www.twilio.com',
] as const;

// ── CRM & Marketing ────────────────────────────────────────────────────────

const CRM_DOCS = [
	'customer.io',
	'dev.mailjet.com',
	'developers.activecampaign.com',
	'developers.brevo.com',
	'developers.convertkit.com',
	'developers.hubspot.com',
	'developers.intercom.com',
	'developers.pipedrive.com',
	'developer.salesforce.com',
	'developer.lemlist.com',
	'documentation.mailgun.com',
	'docs.sendgrid.com',
	'mailchimp.com',
	'postmarkapp.com',
] as const;

// ── Databases & Data ────────────────────────────────────────────────────────

const DATABASE_DOCS = [
	'dev.mysql.com',
	'docs.pinecone.io',
	'docs.snowflake.com',
	'graphql.org',
	'prisma.io',
	'qdrant.tech',
	'redis.io',
	'www.elastic.co',
	'www.mongodb.com',
	'www.postgresql.org',
	'www.sqlite.org',
] as const;

// ── E-commerce & Payments ───────────────────────────────────────────────────

const ECOMMERCE_DOCS = [
	'developer.paddle.com',
	'developer.paypal.com',
	'developer.intuit.com',
	'developer.xero.com',
	'docs.stripe.com',
	'docs.wise.com',
	'shopify.dev',
	'woocommerce.github.io',
] as const;

// ── Frameworks & Languages ──────────────────────────────────────────────────

const FRAMEWORK_DOCS = [
	'angular.io',
	'd3js.org',
	'developer.mozilla.org',
	'docs.python.org',
	'react.dev',
	'tailwindcss.com',
	'threejs.org',
	'vuejs.org',
	'www.typescriptlang.org',
] as const;

// ── HR, Support & Helpdesk ──────────────────────────────────────────────────

const SUPPORT_DOCS = [
	'developer.helpscout.com',
	'developer.pagerduty.com',
	'developer.servicenow.com',
	'developer.zendesk.com',
	'developers.freshdesk.com',
	'documentation.bamboohr.com',
	'docs.sentry.io',
	'docs.zammad.org',
	'uptimerobot.com',
	'workable.readme.io',
] as const;

// ── Productivity & Project Management ───────────────────────────────────────

const PRODUCTIVITY_DOCS = [
	'api.seatable.io',
	'baserow.io',
	'clickup.com',
	'coda.io',
	'developer.atlassian.com',
	'developer.monday.com',
	'developer.todoist.com',
	'developer.typeform.com',
	'developers.asana.com',
	'developers.linear.app',
	'developers.notion.so',
	'docs.nocodb.com',
] as const;

// ── Social & Content ────────────────────────────────────────────────────────

const SOCIAL_DOCS = [
	'developer.spotify.com',
	'developer.twitter.com',
	'developer.x.com',
	'developers.strava.com',
	'docs.discourse.org',
	'learn.microsoft.com',
] as const;

// ── CMS & Website Builders ─────────────────────────────────────────────────

const CMS_DOCS = [
	'developer.webflow.com',
	'developer.wordpress.org',
	'docs.ghost.org',
	'docs.strapi.io',
	'ghost.org',
	'wordpress.org',
	'www.contentful.com',
	'www.storyblok.com',
] as const;

// ── DevTools & Version Control ──────────────────────────────────────────────

const DEVTOOLS_DOCS = [
	'developer.github.com',
	'docs.github.com',
	'docs.gitlab.com',
	'developer.bitbucket.org',
	'www.jenkins.io',
] as const;

// ── File Storage ────────────────────────────────────────────────────────────

const STORAGE_DOCS = [
	'developer.box.com',
	'developers.cloudflare.com',
	'docs.nextcloud.com',
	'www.dropbox.com',
] as const;

// ── Analytics & Monitoring ──────────────────────────────────────────────────

const ANALYTICS_DOCS = [
	'developer.okta.com',
	'developers.google.com',
	'docs.apify.com',
	'docs.tavily.com',
	'firebase.google.com',
	'grafana.com',
	'posthog.com',
	'segment.com',
	'www.metabase.com',
] as const;

// ── Other Services ──────────────────────────────────────────────────────────

const OTHER_DOCS = [
	'api.calendly.com',
	'cal.com',
	'dev.bitly.com',
	'developer.apple.com',
	'developer.copper.com',
	'developer.goto.com',
	'developer.keap.com',
	'developer.rocket.chat',
	'developer.zoom.us',
	'developers.acuityscheduling.com',
	'developers.airtable.com',
	'docs.n8n.io',
	'docs.splunk.com',
	'docs.strangebee.com',
	'docs.supabase.com',
	'gong.app.gong.io',
	'help.getharvest.com',
	'www.eventbrite.com',
	'www.home-assistant.io',
	'www.odoo.com',
] as const;

// ── Aggregate ───────────────────────────────────────────────────────────────

export const ALLOWED_DOMAINS: ReadonlySet<string> = new Set([
	...AI_DOCS,
	...ANALYTICS_DOCS,
	...CLOUD_DOCS,
	...CMS_DOCS,
	...COMMUNICATION_DOCS,
	...CRM_DOCS,
	...DATABASE_DOCS,
	...DEVTOOLS_DOCS,
	...ECOMMERCE_DOCS,
	...FRAMEWORK_DOCS,
	...OTHER_DOCS,
	...PRODUCTIVITY_DOCS,
	...SOCIAL_DOCS,
	...STORAGE_DOCS,
	...SUPPORT_DOCS,
]);

/**
 * Check whether a hostname is on the allow-list.
 * Matches the exact domain or any subdomain of it
 * (e.g. `docs.redis.io` matches the `redis.io` entry).
 */
export function isAllowedDomain(host: string): boolean {
	if (ALLOWED_DOMAINS.has(host)) return true;

	for (const domain of ALLOWED_DOMAINS) {
		if (host.endsWith(`.${domain}`)) return true;
	}

	return false;
}
