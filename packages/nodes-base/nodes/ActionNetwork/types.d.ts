import { languageOptions } from './descriptions/SharedFields';

export type Resource = 'attendance' | 'event' | 'person' | 'personTag' | 'petition' | 'signature' | 'tag';

export type Operation = 'create' | 'delete' | 'get' | 'getAll' | 'update';

export type LanguageCodes = typeof languageOptions[number]['value']

// ----------------------------------------
//              responses
// ----------------------------------------

export type PersonResponse = {
	identifiers: string[];
	email_addresses: EmailAddressField[];
	phone_numbers: PhoneNumberField[];
	postal_addresses: PostalAddressField[];
	languages_spoken: LanguageCodes[];
};

// ----------------------------------------
//              UI fields
// ----------------------------------------

export type AllFieldsUi = {
	email_addresses: EmailAddressUi;
	postal_addresses: PostalAddressesUi;
	phone_numbers: PhoneNumberUi;
	languages_spoken: LanguageCodes;
	target: string;
	location: LocationUi;
}

export type EmailAddressUi = {
	email_addresses_fields: EmailAddressField,
}

export type EmailAddressField = {
	primary: boolean;
	address: string;
	status: EmailStatus;
}

type BaseStatus = 'subscribed' | 'unsubscribed' | 'bouncing' | 'previous bounce';

type EmailStatus = BaseStatus | 'spam complaint' | 'previous spam complaint';

type PhoneNumberUi = {
	phone_numbers_fields: PhoneNumberField[],
}

export type PhoneNumberField = {
	primary: boolean;
	number: string;
	status: BaseStatus;
};

type PostalAddressesUi = {
	postal_addresses_fields: PostalAddressField[],
}

type LocationUi = {
	postal_addresses_fields: PostalAddressField,
}

export type PostalAddressField = {
	primary: boolean;
	address_lines: string;
	locality: string;
	region: string;
	postal_code: string;
	country: string;
	language: LanguageCodes;
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
