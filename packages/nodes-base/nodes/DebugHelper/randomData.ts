import {
	firstName,
	lastName,
	streetAddress,
	cityName,
	zipCode,
	state,
	country,
	password,
	creditCardNumber,
	creditCardCVV,
	email,
	boolean,
	uuid,
	nanoId,
	domainUrl,
	semver,
	latLong,
	macAddress,
	ip,
	ipv6,
	number,
} from 'minifaker';
import 'minifaker/locales/en';

export function generateRandomUser() {
	return {
		uid: uuid.v4(),
		email: email(),
		firstname: firstName(),
		lastname: lastName(),
		password: password(),
	};
}

export function generateRandomAddress() {
	return {
		firstname: firstName(),
		lastname: lastName(),
		street: streetAddress(),
		city: cityName(),
		zip: zipCode({ format: '#####' }),
		state: state(),
		country: country(),
	};
}

export function generateRandomEmail() {
	return {
		email: email(),
		confirmed: boolean(),
	};
}

export function generateUUID() {
	return { uuid: uuid.v4() };
}

export function generateNanoid(customAlphabet: string, length: string) {
	return { nanoId: nanoId.customAlphabet(customAlphabet, parseInt(length, 10))().toString() };
}

export function generateCreditCard() {
	return {
		type: boolean() ? 'MasterCard' : 'Visa',
		number: creditCardNumber(),
		ccv: creditCardCVV(),
		exp: `${number({ min: 1, max: 12, float: false }).toString().padStart(2, '0')}/${number({
			min: 1,
			max: 40,
			float: false,
		})
			.toString()
			.padStart(2, '0')}`,
		holder_name: `${firstName()} ${lastName()}`,
	};
}

export function generateURL() {
	return { url: domainUrl() };
}

export function generateIPv4() {
	return { ip: ip() };
}

export function generateIPv6() {
	return { ipv6: ipv6() };
}

export function generateMAC() {
	return { mac: macAddress() };
}

export function generateLocation() {
	return { location: latLong() };
}

export function generateVersion() {
	return { version: semver() };
}
