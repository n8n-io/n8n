import { isRecord } from '@n8n/utils/is-record';
import type { HttpVendorProfile } from './http-profiles';
import type { HttpToolArgs } from './http-tool-caller';

// Paths of the phone number: `/v19.0/<phone number id>/messages`.
const PHONE_PATH =
	/^(\/v[\d.]+)\/([^/]+)\/(messages|media|whatsapp_business_profile|register)(\/|$)/;
// Paths of the business account: `/v19.0/<business account id>/message_templates`.
const BUSINESS_PATH =
	/^(\/v[\d.]+)\/([^/]+)\/(message_templates|phone_numbers|subscribed_apps)(\/|$)/;

/** The ids that the gym made for the tenant. The real ids are not in the gym. */
export async function whatsappGymFacts(
	data: Record<string, unknown>,
	ask: (path: string) => Promise<unknown>,
): Promise<Record<string, string>> {
	const wabaId = typeof data.businessAccountId === 'string' ? data.businessAccountId : undefined;
	if (!wabaId) return {};
	const numbers = await ask(`/v19.0/${encodeURIComponent(wabaId)}/phone_numbers`);
	const list = isRecord(numbers) && Array.isArray(numbers.data) ? numbers.data : [];
	const first: unknown = list[0];
	const phoneId = isRecord(first) && typeof first.id === 'string' ? first.id : undefined;
	return { wabaId, ...(phoneId !== undefined && { phoneId }) };
}

/** Puts the id of the gym in the place of the real phone number id or business account id of a path. */
export function whatsappToGym(
	args: HttpToolArgs,
	facts: Readonly<Record<string, string>>,
): HttpToolArgs {
	const phone = PHONE_PATH.exec(args.path);
	if (phone && facts.phoneId) {
		return {
			...args,
			path: `${phone[1]}/${facts.phoneId}/${phone[3]}${args.path.slice(phone[0].length - phone[4].length)}`,
		};
	}
	const business = BUSINESS_PATH.exec(args.path);
	if (business && facts.wabaId) {
		return {
			...args,
			path: `${business[1]}/${facts.wabaId}/${business[3]}${args.path.slice(business[0].length - business[4].length)}`,
		};
	}
	return args;
}

export const WHATSAPP_PROFILE: HttpVendorProfile = {
	name: 'whatsapp',
	credentialKind: 'system_user_token',
	credentialField: 'accessToken',
	placeholderSeed: {
		world_version: 1,
		persona: { ref: 'person:me', name: 'Guard', email: 'guard@unknown.invalid' },
	},
	gymFacts: whatsappGymFacts,
	toGym: whatsappToGym,
	// The bytes of a real media are not copied. The gym has its own.
	hydrateRead: (args) => !args.path.startsWith('/whatsapp_business'),
};
