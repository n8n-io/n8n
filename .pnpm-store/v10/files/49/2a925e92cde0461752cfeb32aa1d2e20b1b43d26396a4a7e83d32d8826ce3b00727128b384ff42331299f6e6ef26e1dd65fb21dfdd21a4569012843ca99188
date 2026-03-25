import { __export } from "../_virtual/rolldown_runtime.js";
import { getEnvironmentVariable } from "@langchain/core/utils/env";
import { z } from "zod/v3";
import { StructuredTool } from "@langchain/core/tools";

//#region src/tools/google_routes.ts
var google_routes_exports = {};
__export(google_routes_exports, { GoogleRoutesAPI: () => GoogleRoutesAPI });
const getTimezoneOffsetInHours = () => {
	const offsetInMinutes = (/* @__PURE__ */ new Date()).getTimezoneOffset();
	const offsetInHours = -offsetInMinutes / 60;
	return offsetInHours;
};
/**
* Helper functions to create the response objects for the Google Routes API.
*/
function createDeparture(transitDetails) {
	const { stopDetails, localizedValues } = transitDetails;
	return {
		departureTime: stopDetails.departureTime,
		localizedTime: localizedValues.departureTime.time.text,
		localizedTimezone: localizedValues.departureTime.timeZone,
		departureAddress: stopDetails.departureStop.name
	};
}
function createArrival(transitDetails) {
	const { stopDetails, localizedValues } = transitDetails;
	return {
		arrivalTime: stopDetails.arrivalTime,
		localizedTime: localizedValues.arrivalTime.time.text,
		localizedTimezone: localizedValues.arrivalTime.timeZone,
		arrivalAddress: stopDetails.arrivalStop.name
	};
}
function createTravelInstructions(stepsOverview) {
	return stepsOverview.multiModalSegments.map((segment) => ({
		...segment.navigationInstruction ? { navigationInstruction: segment.navigationInstruction.instructions } : {},
		travelMode: segment.travelMode
	}));
}
function createLocalizedValues(route) {
	const { distance, duration, transitFare } = route.localizedValues;
	return {
		distance: distance.text,
		duration: duration.text,
		...transitFare?.text ? { transitFare: transitFare.text } : {}
	};
}
function createTransitDetails(transitDetails) {
	const { name, nameShort, vehicle } = transitDetails.transitLine;
	return {
		...name ? { transitName: name } : {},
		...nameShort ? { transitNameCode: nameShort } : {},
		transitVehicleType: vehicle.type
	};
}
function createRouteLabel(route) {
	return route.routeLabels;
}
function filterRoutes(route, travel_mode) {
	if (travel_mode === "TRANSIT") {
		const transitStep = route.legs[0].steps.find((step) => step.transitDetails);
		const filteredRoute = {
			departure: createDeparture(transitStep.transitDetails),
			arrival: createArrival(transitStep.transitDetails),
			travelInstructions: createTravelInstructions(route.legs[0].stepsOverview),
			localizedValues: createLocalizedValues(route),
			transitDetails: createTransitDetails(transitStep.transitDetails),
			routeLabels: createRouteLabel(route)
		};
		if (route.warnings && route.warnings.length > 0) filteredRoute.warnings = route.warnings;
		return filteredRoute;
	} else {
		const filteredRoute = {
			description: route.description,
			routeLabels: createRouteLabel(route),
			...createLocalizedValues(route)
		};
		if (route.warnings && route.warnings.length > 0) filteredRoute.warnings = route.warnings;
		if (route.travelAdvisory && route.travelAdvisory.tollInfo) filteredRoute.tollInfo = {
			currencyCode: route.travelAdvisory.tollInfo.estimatedPrice[0].currencyCode,
			value: route.travelAdvisory.tollInfo.estimatedPrice[0].units
		};
		return filteredRoute;
	}
}
const defaultGoogleRoutesSchema = z.object({
	origin: z.string().describe(`Origin address, can be either a place or an address.`),
	destination: z.string().describe(`Destination address, can be either a place or an address.`),
	travel_mode: z.enum([
		"DRIVE",
		"WALK",
		"BICYCLE",
		"TRANSIT",
		"TWO_WHEELER"
	]).describe(`The mode of transport`),
	computeAlternativeRoutes: z.boolean().describe(`Compute alternative routes, set to true if user wants multiple routes, false otherwise.`),
	departureTime: z.string().optional().describe(`Time that the user wants to depart.
      There cannot be a departure time if an arrival time is specified.
      Expected departure time should be provided as a timestamp in RFC3339 format: YYYY-MM-DDThh:mm:ss+00:00. The date should be in UTC time and the +00:00 represents the UTC offset. 
      For instance, if the the user's timezone is -5, the offset would be -05:00 meaning YYYY-MM-DDThh:mm:ss-05:00 with YYYY-MM-DDThh:mm:ss being in UTC. 
      For reference, here is the current time in UTC: ${(/* @__PURE__ */ new Date()).toISOString()} and the user's timezone offset is ${getTimezoneOffsetInHours()}. 
      If the departure time is not specified it should not be included.          
      `),
	arrivalTime: z.string().optional().describe(`Time that the user wants to arrive.
      There cannot be an arrival time if a departure time is specified.
      Expected arrival time should be provided as a timestamp in RFC3339 format: YYYY-MM-DDThh:mm:ss+00:00. The date should be in UTC time and the +00:00 represents the UTC offset. 
      For instance, if the the user's timezone is -5, the offset would be -05:00 meaning YYYY-MM-DDThh:mm:ss-05:00 with YYYY-MM-DDThh:mm:ss being in UTC. 
      For reference, here is the current time in UTC: ${(/* @__PURE__ */ new Date()).toISOString()} and the user's timezone offset is ${getTimezoneOffsetInHours()}. 
      Reminder that the arrival time must be in the future, if the user asks for a arrival time in the past instead of processing the request, warn them that it is not possible to calculate a route for a past time.
      If the user asks for a arrival time in a passed hour today, calculate it for the next day.
      If the arrival time is not specified it should not be included. `),
	transitPreferences: z.object({ routingPreference: z.enum(["LESS_WALKING", "FEWER_TRANSFERS"]).describe(`Transit routing preference.
        By default, it should not be included.`) }).optional().describe(`Transit routing preference.
       By default, it should not be included.`),
	extraComputations: z.array(z.enum(["TOLLS"])).optional().describe(`Calculate tolls for the route.`)
});
/**
* Class for interacting with the Google Routes API
* It extends the StructuredTool class to perform retrieval.
*/
var GoogleRoutesAPI = class extends StructuredTool {
	static lc_name() {
		return "GoogleRoutesAPI";
	}
	get lc_secrets() {
		return { apiKey: "GOOGLE_ROUTES_API_KEY" };
	}
	name;
	description;
	apiKey;
	schema = defaultGoogleRoutesSchema;
	constructor(fields) {
		super(...arguments);
		const apiKey = fields?.apiKey ?? getEnvironmentVariable("GOOGLE_ROUTES_API_KEY");
		if (apiKey === void 0) throw new Error(`Google Routes API key not set. You can set it as "GOOGLE_ROUTES_API_KEY" in your environment variables.`);
		this.apiKey = apiKey;
		this.name = "google_routes";
		this.description = `
    This tool retrieves routing info using the Google Routes API for driving, walking, biking, transit, and two-wheeler routes. Get departure/arrival times, travel instructions, transit fare, warnings, alternative routes, tolls prices, and routing preferences like less walking or fewer transfers.

    Output:
    - "TRANSIT" mode: Departure/arrival details, transit name/code, fare, details, warnings, alternative routes, and expected departure/arrival times.
    - Other modes: Route description, distance, duration, warnings, alternative routes, tolls prices, and expected departure/arrival times.
    
    Current time in user's timezone: ${(/* @__PURE__ */ new Date()).toLocaleString()}.
    `;
	}
	async _call(input) {
		const { origin, destination, travel_mode, computeAlternativeRoutes, departureTime, arrivalTime, transitPreferences, extraComputations } = input;
		const now = /* @__PURE__ */ new Date();
		if (departureTime && new Date(departureTime) < now) return "It is not possible to calculate a route with a past departure time. Warn the user that it is not possible to calculate a route with a past departure time.";
		if (arrivalTime && new Date(arrivalTime) < now) return "It is not possible to calculate a route with a past arrival time. Warn the user that it is not possible to calculate a route with a past arrival time.";
		if (travel_mode !== "TRANSIT" && arrivalTime) return "It is not possible to calculate an arrival time for modes other than transit. Warn the user that it is not possible to calculate an arrival time for the selected mode of transport.";
		if (travel_mode === "TRANSIT" && extraComputations) return "It is not possible to calculate tolls for transit mode. Warn the user that it is not possible to calculate tolls for transit mode.";
		const body = {
			origin: { address: origin },
			destination: { address: destination },
			travel_mode,
			computeAlternativeRoutes: computeAlternativeRoutes ?? false,
			departureTime,
			arrivalTime,
			transitPreferences,
			extraComputations: extraComputations ?? []
		};
		let fieldMask = "routes.description,routes.localizedValues,routes.travelAdvisory,routes.legs.steps.transitDetails,routes.routeLabels,routes.warnings";
		if (travel_mode === "TRANSIT") fieldMask += ",routes.legs.stepsOverview";
		if (travel_mode === "DRIVE" || travel_mode === "TWO_WHEELER") body.routing_preference = "TRAFFIC_AWARE";
		const res = await fetch(`https://routes.googleapis.com/directions/v2:computeRoutes`, {
			method: "POST",
			body: JSON.stringify(body),
			headers: {
				"X-Goog-Api-Key": this.apiKey,
				"X-Goog-FieldMask": fieldMask,
				"Content-Type": "application/json"
			}
		});
		if (!res.ok) {
			let message;
			try {
				const json$1 = await res.json();
				message = json$1.error.message;
			} catch (e) {
				message = `Unable to parse error message: Google did not return a JSON response. Error: ${e}`;
			}
			throw new Error(`Got ${res.status}: ${res.statusText} error from Google Routes API: ${message}`);
		}
		const json = await res.json();
		if (Object.keys(json).length === 0) return "Invalid route. The route may be too long or impossible to travel by the selected mode of transport.";
		const routes = json.routes.map((route) => filterRoutes(route, travel_mode));
		return JSON.stringify(routes);
	}
};

//#endregion
export { GoogleRoutesAPI, google_routes_exports };
//# sourceMappingURL=google_routes.js.map