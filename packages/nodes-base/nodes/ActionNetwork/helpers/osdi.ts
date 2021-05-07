// E.g. ["actionnetwork:asdasa-21321asdasd-sadada", "mailchimp:123124141"]
// Returns { actionnetwork: "asdasa-21321asdasd-sadada", mailchimp: 123124141 }
export const createIdentifierDictionary = (ids: string[]) => ids.reduce(
	(dict, id: string) => {
		try {
			const [prefix, ...suffixes] = id.split(':');
			dict[prefix] = suffixes.join('');
		} catch (e) {}
		return dict;
	},
	{} as { [source: string]: string }
)


/**
 * Linking to resources
 */

const OSDIResources = {
	"osdi:person": {
		"title": "The collection of people in the system",
		"href": "https://actionnetwork.org/api/v2/people"
	},
	"osdi:event": {
		"title": "The collection of events in the system",
		"href": "https://actionnetwork.org/api/v2/events"
	},
	"osdi:petition": {
		"title": "The collection of petitions in the system",
		"href": "https://actionnetwork.org/api/v2/petitions"
	},
	"osdi:fundraising_page": {
		"title": "The collection of fundraising_pages in the system",
		"href": "https://actionnetwork.org/api/v2/fundraising_pages"
	},
	"osdi:donation": {
		"title": "The collection of donations in the system",
		"href": "https://actionnetwork.org/api/v2/donations"
	},
	"osdi:query": {
		"title": "The collection of queries in the system",
		"href": "https://actionnetwork.org/api/v2/queries"
	},
	"osdi:form": {
		"title": "The collection of forms in the system",
		"href": "https://actionnetwork.org/api/v2/forms"
	},
	"action_network:event_campaign": {
		"title": "The collection of event campaigns in the system",
		"href": "https://actionnetwork.org/api/v2/event_campaigns"
	},
	"action_network:campaign": {
		"title": "The collection of campaigns in the system",
		"href": "https://actionnetwork.org/api/v2/campaigns"
	},
	"osdi:tag": {
		"title": "The collection of tags in the system",
		"href": "https://actionnetwork.org/api/v2/tags"
	},
	"osdi:list": {
		"title": "The collection of lists in the system",
		"href": "https://actionnetwork.org/api/v2/lists"
	},
	"osdi:wrapper": {
		"title": "The collection of email wrappers in the system",
		"href": "https://actionnetwork.org/api/v2/wrappers"
	},
	"osdi:message": {
		"title": "The collection of messages in the system",
		"href": "https://actionnetwork.org/api/v2/messages"
	},
	"osdi:person_signup_helper": {
		"title": "Person Signup Helper",
		"href": "https://actionnetwork.org/api/v2/people"
	},
	"osdi:advocacy_campaign": {
		"title": "The collection of advocacy_campaigns in the system",
		"href": "https://actionnetwork.org/api/v2/advocacy_campaigns"
	}
}

export const createResourceLink = (name: keyof typeof OSDIResources, href: string) => {
	const urlPrefix = OSDIResources[name].href!
	if (!href.startsWith(urlPrefix)) {
		href = `${urlPrefix}/${href}`
	}
	return {
		_links: { [name]: {	href } }
	}
}

export const getResourceIDFromURL = (name: keyof typeof OSDIResources, href: string) => {
	const urlPrefix = OSDIResources[name].href!
	if (href.startsWith(urlPrefix)) {
		href = href.replace(urlPrefix, '')
	}
	return href
}
