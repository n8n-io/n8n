export type EmailFixedCollection = {
	email?: {
		emailFields: Array<{ email: string; category: string }>;
	};
};

export type EmailsFixedCollection = {
	emails?: {
		emailFields: Array<{ email: string; category: string }>;
	};
};

export type PhoneNumbersFixedCollection = {
	phone_numbers?: {
		phoneFields: object;
	};
};

export type AddressFixedCollection = {
	address?: {
		addressFields: object;
	};
};
