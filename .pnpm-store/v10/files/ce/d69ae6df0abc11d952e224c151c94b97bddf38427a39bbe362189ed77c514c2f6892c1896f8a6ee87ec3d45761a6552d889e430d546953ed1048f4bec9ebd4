/**
 * Raw data sent by API
 */

// Links
export interface APIProviderRawDataLinks {
	// Collections list
	home?: string;
	// Collection. Available variables: {prefix}
	collection?: string;
	// Icon. Available variables: {prefix}, {name}
	icon?: string;
}

// NPM
export interface APIProviderRawDataNPM {
	// Package name for installation. Available variables: {prefix}
	package?: string;

	// Icon import source. Available variables: {prefix}, {name}
	icon?: string;
}

// Main type
export interface APIProviderRawData {
	// Provider name (as used in icon names)
	provider: string;

	// Provider name (human readable version)
	title?: string;

	// API link(s), though they are usually redundant because API end point is used to retrieve data
	api?: string | string[];

	// Links to website
	links?: APIProviderRawDataLinks;

	// NPM packages for icons, used when showing code samples
	npm?: APIProviderRawDataNPM;

	// SVG generator URL, including full host name, {prefix} and {name} variables
	// Example: 'https://api.iconify.design/{prefix}/{name}.svg'
	svg?: string;
}
