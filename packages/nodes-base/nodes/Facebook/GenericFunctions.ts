import { OptionsWithUri } from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
} from 'n8n-core';

import { IDataObject, NodeApiError } from 'n8n-workflow';

import { capitalCase } from 'change-case';

export async function facebookApiRequest(
	this:
		| IHookFunctions
		| IExecuteFunctions
		| IExecuteSingleFunctions
		| ILoadOptionsFunctions
		| IWebhookFunctions,
	method: string,
	resource: string,

	body: any = {},
	qs: IDataObject = {},
	uri?: string,
	_option: IDataObject = {},
): Promise<any> {
	let credentials;

	if (this.getNode().name.includes('Trigger')) {
		credentials = await this.getCredentials('facebookGraphAppApi');
	} else {
		credentials = await this.getCredentials('facebookGraphApi');
	}

	qs.access_token = credentials.accessToken;

	const options: OptionsWithUri = {
		headers: {
			accept: 'application/json,text/*;q=0.99',
		},
		method,
		qs,
		body,
		gzip: true,
		uri: uri || `https://graph.facebook.com/v8.0${resource}`,
		json: true,
	};

	try {
		return await this.helpers.request!(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export function getFields(object: string) {
	const data = {
		adAccount: [
			{
				value: 'in_process_ad_objects',
			},
			{
				value: 'with_issues_ad_objects',
			},
		],
		page: [
			{
				value: 'affiliation',
				description: `Describes changes to a page's Affliation profile field`,
			},
			{
				value: 'attire',
				description: `Describes changes to a page's Attire profile field`,
			},
			{
				value: 'awards',
				description: `Describes changes to a page's Awards profile field`,
			},
			{
				value: 'bio',
				description: `Describes changes to a page's Biography profile field`,
			},
			{
				value: 'birthday',
				description: `Describes changes to a page's Birthday profile field`,
			},
			{
				value: 'category',
				description: `Describes changes to a page's Birthday profile field`,
			},
			{
				value: 'company_overview',
				description: `Describes changes to a page's Company Overview profile field`,
			},
			{
				value: 'culinary_team',
				description: `Describes changes to a page's Culinary Team profile field`,
			},
			{
				value: 'current_location',
				description: `Describes changes to a page's Current Location profile field`,
			},
			{
				value: 'description',
				description: `Describes changes to a page's Story Description profile field`,
			},
			{
				value: 'email',
				description: `Describes changes to a page's Email profile field`,
			},
			{
				value: 'feed',
				description: `Describes nearly all changes to a Page's feed, such as Posts, shares, likes, etc`,
			},
			{
				value: 'founded',
				description: `Describes changes to a page's Founded profile field. This is different from the Start Date field`,
			},
			{
				value: 'general_info',
				description: `Describes changes to a page's General Information profile field`,
			},
			{
				value: 'general_manager',
				description: `Describes changes to a page's General Information profile field`,
			},
			{
				value: 'hometown',
				description: `Describes changes to a page's Homewtown profile field`,
			},
			{
				value: 'hours',
				description: `Describes changes to a page's Hours profile field`,
			},
			{
				value: 'leadgen',
				description: `Describes changes to a page's leadgen settings`,
			},
			{
				value: 'live_videos',
				description: `Describes changes to a page's live video status`,
			},
			{
				value: 'location',
				description: `Describes changes to a page's Location profile field`,
			},
			{
				value: 'members',
				description: `Describes changes to a page's Members profile field`,
			},
			{
				value: 'mention',
				description: `Describes new mentions of a page, including mentions in comments, posts, etc`,
			},
			{
				value: 'merchant_review',
				description: `Describes changes to a page's merchant review settings`,
			},
			{
				value: 'mission',
				description: `Describes changes to a page's Mission profile field`,
			},
			{
				value: 'name',
				description: `Describes changes to a page's Name profile field.`,
			},
			{
				value: 'page_about_story',
			},
			{
				value: 'page_change_proposal',
				description: `Data for page change proposal.`,
			},
			{
				value: 'page_upcoming_change',
				description: `Webhooks data for page upcoming changes`,
			},
			{
				value: 'parking',
				description: `Describes changes to a page's Parking profile field`,
			},
			{
				value: 'payment_options',
				description: `Describes change to a page's Payment profile field`,
			},
			{
				value: 'personal_info',
				description: `Describes changes to a page's Personal Information profile field.`,
			},
			{
				value: 'personal_interests',
				description: `Describes changes to a page's Personal Interests profile field.`,
			},
			{
				value: 'phone',
				description: `Describes changes to a page's Phone profile field`,
			},
			{
				value: 'picture',
				description: `Describes changes to a page's profile picture`,
			},
			{
				value: 'price_range',
				description: `Describes changes to a page's Price Range profile field`,
			},
			{
				value: 'product_review',
				description: `Describes changes to a page's product review settings`,
			},
			{
				value: 'products',
				description: `Describes changes to a page's Products profile field`,
			},
			{
				value: 'public_transit',
				description: `Describes changes to a page's Public Transit profile field`,
			},
			{
				value: 'ratings',
				description: `Describes changes to a page's ratings, including new ratings or a user's comments or reactions on a rating`,
			},
			{
				value: 'videos',
				description: `Describes changes to the encoding status of a video on a page`,
			},
			{
				value: 'website',
				description: `Describes changes to a page's Website profile field`,
			},
		],
		application: [
			{
				value: 'ad_account',
			},
			{
				value: 'ads_rules_engine',
			},
			{
				value: 'async_requests',
			},
			{
				value: 'async_sessions',
			},
			{
				value: 'group_install',
			},
			{
				value: 'oe_reseller_onboarding_request_created',
			},
			{
				value: 'plugin_comment',
			},
			{
				value: 'plugin_comment_reply',
			},
			{
				value: 'plugin_comment_reply',
			},
		],
		certificateTransparency: [
			{
				value: 'certificate',
			},
			{
				value: 'phishing',
			},
		],
		instagram: [
			{
				value: 'comments',
				description: 'Notifies you when an Instagram User comments on a media object that you own',
			},
			{
				value: 'messaging_handover',
			},
			{
				value: 'mentions',
				description:
					'Notifies you when an Instagram User @mentions you in a comment or caption on a media object that you do not own',
			},
			{
				value: 'messages',
			},
			{
				value: 'messaging_seen',
			},
			{
				value: 'standby',
			},
			{
				value: 'story_insights',
			},
		],
		permissions: [
			{
				value: 'bookmarked',
				description: 'Whether the user has added or removed the app bookmark',
			},
			{
				value: 'connected',
				description: 'Whether the user is connected or disconnected from the app',
			},
			{
				value: 'user_birthday',
			},
			{
				value: 'user_hometown',
			},
			{
				value: 'user_location',
			},
			{
				value: 'user_likes',
			},
			{
				value: 'user_managed_groups',
			},
			{
				value: 'user_events',
			},
			{
				value: 'user_photos',
			},
			{
				value: 'user_videos',
			},
			{
				value: 'user_friends',
			},
			{
				value: 'user_posts',
			},
			{
				value: 'user_gender',
			},
			{
				value: 'user_link',
			},
			{
				value: 'user_age_range',
			},
			{
				value: 'email',
			},
			{
				value: 'read_insights',
			},
			{
				value: 'read_page_mailboxes',
			},
			{
				value: 'pages_show_list',
			},
			{
				value: 'pages_manage_cta',
			},
			{
				value: 'business_management',
			},
			{
				value: 'pages_messaging',
			},
			{
				value: 'pages_messaging_phone_number',
			},
			{
				value: 'pages_messaging_subscriptions',
			},
			{
				value: 'read_audience_network_insights',
			},
			{
				value: 'pages_manage_instant_articles',
			},
			{
				value: 'publish_video',
			},
			{
				value: 'openid',
			},
			{
				value: 'catalog_management',
			},
			{
				value: 'gaming_user_locale',
			},
			{
				value: 'groups_show_list',
			},
			{
				value: 'instagram_basic',
			},
			{
				value: 'instagram_manage_comments',
			},
			{
				value: 'instagram_manage_insights',
			},
			{
				value: 'instagram_content_publish',
			},
			{
				value: 'publish_to_groups',
			},
			{
				value: 'groups_access_member_info',
			},
			{
				value: 'leads_retrieval',
			},
			{
				value: 'whatsapp_business_management',
			},
			{
				value: 'instagram_manage_messages',
			},
			{
				value: 'attribution_read',
			},
			{
				value: 'page_events',
			},
			{
				value: 'ads_management',
			},
			{
				value: 'ads_read',
			},
			{
				value: 'pages_read_engagement',
			},
			{
				value: 'pages_manage_metadata',
			},
			{
				value: 'pages_read_user_content',
			},
			{
				value: 'pages_manage_ads',
			},
			{
				value: 'pages_manage_posts',
			},
			{
				value: 'pages_manage_engagement',
			},
			{
				value: 'public_search',
			},
			{
				value: 'social_ads',
			},
		],
		users: [
			{
				value: 'about',
			},
			{
				value: 'birthday',
			},
			{
				value: 'books',
			},
			{
				value: 'email',
			},
			{
				value: 'feed',
			},
			{
				value: 'first_name',
			},
			{
				value: 'friends',
			},
			{
				value: 'gender',
			},
			{
				value: 'hometown',
			},
			{
				value: 'last_name',
			},
			{
				value: 'likes',
			},
			{
				value: 'live_videos',
			},
			{
				value: 'location',
			},
			{
				value: 'music',
			},
			{
				value: 'name',
			},
			{
				value: 'photos',
			},
			{
				value: 'pic_big_https',
			},
			{
				value: 'pic_https',
			},
			{
				value: 'pic_small_https',
			},
			{
				value: 'pic_square_https',
			},
			{
				value: 'platform',
			},
			{
				value: 'quotes',
			},
			{
				value: 'status',
			},
			{
				value: 'television',
			},
			{
				value: 'videos',
			},
		],
		whatsappBusinessAccount: [
			{
				value: 'message_template_status_update',
			},
			{
				value: 'phone_number_name_update',
			},
			{
				value: 'phone_number_quality_update',
			},
			{
				value: 'account_review_update',
			},
			{
				value: 'account_update',
			},
		],
	} as { [key: string]: any };

	return [{ name: '*', value: '*' }].concat(data[object] || []).map((fieldObject: IDataObject) => ({
		...fieldObject,
		name: fieldObject.value !== '*' ? capitalCase(fieldObject.value as string) : fieldObject.value,
	}));
}

export function getAllFields(object: string) {
	return getFields(object)
		.filter((field: IDataObject) => field.value !== '*')
		.map((field: IDataObject) => field.value);
}
