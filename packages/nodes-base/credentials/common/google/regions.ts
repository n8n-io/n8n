export interface GoogleRegion {
	name: string;
	displayName: string;
	location: string;
}

export const googleRegions: GoogleRegion[] = [
	{
		name: 'africa-south1',
		displayName: 'Africa',
		location: 'Johannesburg',
	},
	{
		name: 'asia-east1',
		displayName: 'Asia Pacific',
		location: 'Changhua County',
	},
	{
		name: 'asia-east2',
		displayName: 'Asia Pacific',
		location: 'Hong Kong',
	},
	{
		name: 'asia-northeast1',
		displayName: 'Asia Pacific',
		location: 'Tokyo',
	},
	{
		name: 'asia-northeast2',
		displayName: 'Asia Pacific',
		location: 'Osaka',
	},
	{
		name: 'asia-northeast3',
		displayName: 'Asia Pacific',
		location: 'Seoul',
	},
	{
		name: 'asia-south1',
		displayName: 'Asia Pacific',
		location: 'Mumbai',
	},
	{
		name: 'asia-south2',
		displayName: 'Asia Pacific',
		location: 'Delhi',
	},
	{
		name: 'asia-southeast1',
		displayName: 'Asia Pacific',
		location: 'Jurong West',
	},
	{
		name: 'asia-southeast2',
		displayName: 'Asia Pacific',
		location: 'Jakarta',
	},
	{
		name: 'australia-southeast1',
		displayName: 'Asia Pacific',
		location: 'Sydney',
	},
	{
		name: 'australia-southeast2',
		displayName: 'Asia Pacific',
		location: 'Melbourne',
	},
	{
		name: 'europe-central2',
		displayName: 'Europe',
		location: 'Warsaw',
	},
	{
		name: 'europe-north1',
		displayName: 'Europe',
		location: 'Hamina',
	},
	{
		name: 'europe-southwest1',
		displayName: 'Europe',
		location: 'Madrid',
	},
	{
		name: 'europe-west1',
		displayName: 'Europe',
		location: 'St. Ghislain',
	},
	{
		name: 'europe-west10',
		displayName: 'Europe',
		location: 'Berlin',
	},
	{
		name: 'europe-west12',
		displayName: 'Europe',
		location: 'Turin',
	},
	{
		name: 'europe-west2',
		displayName: 'Europe',
		location: 'London',
	},
	{
		name: 'europe-west3',
		displayName: 'Europe',
		location: 'Frankfurt',
	},
	{
		name: 'europe-west4',
		displayName: 'Europe',
		location: 'Eemshaven',
	},
	{
		name: 'europe-west6',
		displayName: 'Europe',
		location: 'Zurich',
	},
	{
		name: 'europe-west8',
		displayName: 'Europe',
		location: 'Milan',
	},
	{
		name: 'europe-west9',
		displayName: 'Europe',
		location: 'Paris',
	},
	{
		name: 'me-central1',
		displayName: 'Middle East',
		location: 'Doha',
	},
	{
		name: 'me-central2',
		displayName: 'Middle East',
		location: 'Dammam',
	},
	{
		name: 'me-west1',
		displayName: 'Middle East',
		location: 'Tel Aviv',
	},
	{
		name: 'northamerica-northeast1',
		displayName: 'Americas',
		location: 'Montréal',
	},
	{
		name: 'northamerica-northeast2',
		displayName: 'Americas',
		location: 'Toronto',
	},
	{
		name: 'northamerica-south1',
		displayName: 'Americas',
		location: 'Queretaro',
	},
	{
		name: 'southamerica-east1',
		displayName: 'Americas',
		location: 'Osasco',
	},
	{
		name: 'southamerica-west1',
		displayName: 'Americas',
		location: 'Santiago',
	},
	{
		name: 'us-central1',
		displayName: 'Americas',
		location: 'Council Bluffs',
	},
	{
		name: 'us-east1',
		displayName: 'Americas',
		location: 'Moncks Corner',
	},
	{
		name: 'us-east4',
		displayName: 'Americas',
		location: 'Ashburn',
	},
	{
		name: 'us-east5',
		displayName: 'Americas',
		location: 'Columbus',
	},
	{
		name: 'us-south1',
		displayName: 'Americas',
		location: 'Dallas',
	},
	{
		name: 'us-west1',
		displayName: 'Americas',
		location: 'The Dalles',
	},
	{
		name: 'us-west2',
		displayName: 'Americas',
		location: 'Los Angeles',
	},
	{
		name: 'us-west3',
		displayName: 'Americas',
		location: 'Salt Lake City',
	},
	{
		name: 'us-west4',
		displayName: 'Americas',
		location: 'Las Vegas',
	},
];

export function getGoogleRegionOptions() {
	return googleRegions.map((r) => ({
		name: `${r.displayName} (${r.location}) - ${r.name}`,
		value: r.name,
	}));
}
