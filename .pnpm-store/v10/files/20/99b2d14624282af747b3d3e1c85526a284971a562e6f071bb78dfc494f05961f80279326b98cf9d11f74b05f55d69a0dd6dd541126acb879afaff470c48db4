const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const __langchain_core_utils_env = require_rolldown_runtime.__toESM(require("@langchain/core/utils/env"));
const __langchain_core_tools = require_rolldown_runtime.__toESM(require("@langchain/core/tools"));

//#region src/tools/google_places.ts
var google_places_exports = {};
require_rolldown_runtime.__export(google_places_exports, { GooglePlacesAPI: () => GooglePlacesAPI });
/**
* Tool that queries the Google Places API
*/
var GooglePlacesAPI = class extends __langchain_core_tools.Tool {
	static lc_name() {
		return "GooglePlacesAPI";
	}
	get lc_secrets() {
		return { apiKey: "GOOGLE_PLACES_API_KEY" };
	}
	name = "google_places";
	apiKey;
	description = `A wrapper around Google Places API. Useful for when you need to validate or 
  discover addresses from ambiguous text. Input should be a search query.`;
	constructor(fields) {
		super(...arguments);
		const apiKey = fields?.apiKey ?? (0, __langchain_core_utils_env.getEnvironmentVariable)("GOOGLE_PLACES_API_KEY");
		if (apiKey === void 0) throw new Error(`Google Places API key not set. You can set it as "GOOGLE_PLACES_API_KEY" in your environment variables.`);
		this.apiKey = apiKey;
	}
	async _call(input) {
		const res = await fetch(`https://places.googleapis.com/v1/places:searchText`, {
			method: "POST",
			body: JSON.stringify({
				textQuery: input,
				languageCode: "en"
			}),
			headers: {
				"X-Goog-Api-Key": this.apiKey,
				"X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.id,places.internationalPhoneNumber,places.websiteUri",
				"Content-Type": "application/json"
			}
		});
		if (!res.ok) {
			let message;
			try {
				const json$1 = await res.json();
				message = json$1.error.message;
			} catch {
				message = "Unable to parse error message: Google did not return a JSON response.";
			}
			throw new Error(`Got ${res.status}: ${res.statusText} error from Google Places API: ${message}`);
		}
		const json = await res.json();
		const results = json?.places?.map((place) => ({
			name: place.displayName?.text,
			id: place.id,
			address: place.formattedAddress,
			phoneNumber: place.internationalPhoneNumber,
			website: place.websiteUri
		})) ?? [];
		return JSON.stringify(results);
	}
};

//#endregion
exports.GooglePlacesAPI = GooglePlacesAPI;
Object.defineProperty(exports, 'google_places_exports', {
  enumerable: true,
  get: function () {
    return google_places_exports;
  }
});
//# sourceMappingURL=google_places.cjs.map