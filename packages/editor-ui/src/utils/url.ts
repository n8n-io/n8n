export const isValidUrl = (url: string) => {
	try {
		new URL(url); // tslint:disable-line
	} catch (e) {
		return false;
	}
	return true;
};

export const isExternalUrl = (url: string) => {
	try {
		const current = window.location.origin;
		const origin = new URL(url).origin;
	
		return current !== origin;
	} catch (e) {
		return false;
	}
};