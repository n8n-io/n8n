// ----------------------------------------
//              UI fields
// ----------------------------------------

export type AllFieldsUi = {
	email_addresses: EmailAddressUi;
	postal_addresses: PostalAddressesUi;
	phone_numbers: PhoneNumberUi;
	languages_spoken: string;
	target: string;
	location: LocationUi;
}

export type EmailAddressUi = {
	email_addresses_fields: {
		primary: boolean;
		address: string;
		status: EmailStatus;
	},
}

type BaseStatus = 'subscribed' | 'unsubscribed' | 'bouncing' | 'previous bounce';

type EmailStatus = BaseStatus | 'spam complaint' | 'previous spam complaint';

type PhoneNumberUi = {
	phone_numbers_fields: Array<{
		primary: boolean;
		address: string;
		status: BaseStatus;
	}>,
}

type PostalAddressesUi = {
	postal_addresses_fields: Array<AddressField>,
}

type LocationUi = {
	postal_addresses_fields: AddressField,
}

type AddressField = {
	primary: boolean;
	address_lines: { line_fields: Array<{ line: string }> };
	locality: string;
	region: string;
	postal_code: string;
	country: string;
	language: string;
	location: { location_fields: LatitudeLongitude }
}

type LatitudeLongitude = {
	latitude: string;
	longitude: string;
}

// ----------------------------------------
//           loaded resources
// ----------------------------------------

export type ResourceIds = { identifiers: string[] }

export type LoadedTag = ResourceIds & { name: string };

export type LodadedTagging = {
	_links: {
		self: {
			href: string;
		}
	}
};
