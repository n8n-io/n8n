// Use case: business-owner / Product Listings Feed to File Storage.
// Swap a tool: replace only the nodes marked with that family. Keep the variable names
// and the fields the next node reads.
// The listings API returns { listings: [{ id, title, price, currency, url, image_url }] }.
// Change the element names in Map Listing Fields when the portal expects other names.
import { workflow, node, trigger, placeholder, newCredential, expr } from '@n8n/workflow-sdk';

// Runs every 30 minutes.
const every30Minutes = trigger({
	type: 'n8n-nodes-base.scheduleTrigger',
	version: 1.4,
	config: {
		name: 'Every 30 Minutes',
		parameters: { rule: { interval: [{ field: 'minutes', minutesInterval: 30 }] } },
	},
});

// Fetches the current listings from the source system.
const fetchListings = node({
	type: 'n8n-nodes-base.httpRequest',
	version: 4.5,
	config: {
		name: 'Fetch Listings',
		parameters: {
			method: 'GET',
			url: placeholder(
				'Listings API URL that returns JSON, for example https://api.example.com/listings',
			),
		},
		output: [
			{
				listings: [
					{
						id: 'L-1042',
						title: 'Two bedroom apartment near the park',
						price: 250000,
						currency: 'EUR',
						url: 'https://example.com/listings/L-1042',
						image_url: 'https://example.com/images/L-1042.jpg',
					},
				],
			},
		],
	},
});

// One item per listing.
const oneItemPerListing = node({
	type: 'n8n-nodes-base.splitOut',
	version: 1,
	config: {
		name: 'One Item per Listing',
		parameters: { fieldToSplitOut: 'listings', include: 'noOtherFields', options: {} },
	},
});

// Maps the source fields to the element names the portal feed expects.
const mapListingFields = node({
	type: 'n8n-nodes-base.set',
	version: 3.4,
	config: {
		name: 'Map Listing Fields',
		parameters: {
			mode: 'manual',
			includeOtherFields: false,
			assignments: {
				assignments: [
					{ id: 'a1', name: 'reference', value: expr('{{ $json.id }}'), type: 'string' },
					{ id: 'a2', name: 'title', value: expr('{{ $json.title }}'), type: 'string' },
					{ id: 'a3', name: 'price', value: expr('{{ $json.price }}'), type: 'number' },
					{ id: 'a4', name: 'currency', value: expr('{{ $json.currency }}'), type: 'string' },
					{ id: 'a5', name: 'link', value: expr('{{ $json.url }}'), type: 'string' },
					{ id: 'a6', name: 'image', value: expr('{{ $json.image_url }}'), type: 'string' },
				],
			},
		},
	},
});

// Collects the listings into one item, one <listing> element each.
const collectListings = node({
	type: 'n8n-nodes-base.aggregate',
	version: 1,
	config: {
		name: 'Collect Listings',
		parameters: {
			aggregate: 'aggregateAllItemData',
			destinationFieldName: 'listing',
			include: 'allFields',
		},
	},
});

// Converts the item to XML text under a <listings> root. The next node reads $json.data.
const toXml = node({
	type: 'n8n-nodes-base.xml',
	version: 1,
	config: {
		name: 'To XML',
		parameters: { mode: 'jsonToxml', dataPropertyName: 'data', options: { rootName: 'listings' } },
		output: [
			{
				data: '<?xml version="1.0" encoding="UTF-8"?><listings><listing><reference>L-1042</reference></listing></listings>',
			},
		],
	},
});

// [file storage] Tool. Swap for another file storage: replace this node only. It reads
// $json.data, the XML text, and writes it to a fixed file name the portal fetches by URL.
const uploadFeed = node({
	type: 'n8n-nodes-base.awsS3',
	version: 2,
	config: {
		name: 'Upload Feed',
		credentials: { aws: newCredential('AWS account') },
		parameters: {
			resource: 'file',
			operation: 'upload',
			bucketName: placeholder('S3 bucket name, for example acme-feeds'),
			fileName: placeholder('Object key of the feed file, for example feeds/listings.xml'),
			binaryData: false,
			fileContent: expr('{{ $json.data }}'),
			additionalFields: { acl: 'publicRead' },
		},
	},
});

export default workflow('id', 'Product Listings Feed to File Storage')
	.add(every30Minutes)
	.to(fetchListings)
	.to(oneItemPerListing)
	.to(mapListingFields)
	.to(collectListings)
	.to(toXml)
	.to(uploadFeed);
