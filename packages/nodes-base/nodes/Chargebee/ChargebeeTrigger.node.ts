import type { IWebhookFunctions } from 'n8n-core';

import type {
	IDataObject,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
} from 'n8n-workflow';

export class ChargebeeTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Chargebee Trigger',
		name: 'chargebeeTrigger',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
		icon: 'file:chargebee.png',
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow when Chargebee events occur',
		defaults: {
			name: 'Chargebee Trigger',
		},
		inputs: [],
		outputs: ['main'],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				required: true,
				default: [],
				options: [
					{
						name: '*',
						value: '*',
						description: 'Any time any event is triggered (Wildcard Event)',
					},
					{
						name: 'Card Added',
						value: 'card_added',
						description: 'Triggered when a card is added for a customer',
					},
					{
						name: 'Card Deleted',
						value: 'card_deleted',
						description: 'Triggered when a card is deleted for a customer',
					},
					{
						name: 'Card Expired',
						value: 'card_expired',
						description: 'Triggered when the card for a customer has expired',
					},
					{
						name: 'Card Expiring',
						value: 'card_expiring',
						description:
							"Triggered when the customer's credit card is expiring soon.Triggered 30 days before the expiry date",
					},
					{
						name: 'Card Updated',
						value: 'card_updated',
						description: 'Triggered when the card is updated for a customer',
					},
					{
						name: 'Customer Changed',
						value: 'customer_changed',
						description: 'Triggered when a customer is changed',
					},
					{
						name: 'Customer Created',
						value: 'customer_created',
						description: 'Triggered when a customer is created',
					},
					{
						name: 'Customer Deleted',
						value: 'customer_deleted',
						description: 'Triggered when a customer is deleted',
					},
					{
						name: 'Invoice Created',
						value: 'invoice_created',
						description:
							"Event triggered (in the case of metered billing) when a 'Pending' invoice is created that has usage related charges or line items to be added, before being closed. This is triggered only when the “Notify for Pending Invoices” option is enabled.",
					},
					{
						name: 'Invoice Deleted',
						value: 'invoice_deleted',
						description: 'Event triggered when an invoice is deleted',
					},
					{
						name: 'Invoice Generated',
						value: 'invoice_generated',
						description:
							"Event triggered when a new invoice is generated. In case of metered billing, this event is triggered when a 'Pending' invoice is closed.",
					},
					{
						name: 'Invoice Updated',
						value: 'invoice_updated',
						description:
							'Triggered when the invoice’s shipping/billing address is updated, if the invoice is voided, or when the amount due is modified due to payments applied/removed',
					},
					{
						name: 'Payment Failed',
						value: 'payment_failed',
						description: "Triggered when attempt to charge customer's credit card fails",
					},
					{
						name: 'Payment Initiated',
						value: 'payment_initiated',
						description: 'Triggered when a payment is initiated via direct debit',
					},
					{
						name: 'Payment Refunded',
						value: 'payment_refunded',
						description: 'Triggered when a payment refund is made',
					},
					{
						name: 'Payment Succeeded',
						value: 'payment_succeeded',
						description: 'Triggered when the payment is successfully collected',
					},
					{
						name: 'Refund Initiated',
						value: 'refund_initiated',
						description: 'Triggered when a refund is initiated via direct debit',
					},
					{
						name: 'Subscription Activated',
						value: 'subscription_activated',
						description:
							"Triggered after the subscription has been moved from 'Trial' to 'Active' state",
					},
					{
						name: 'Subscription Cancellation Scheduled',
						value: 'subscription_cancellation_scheduled',
						description:
							'Triggered when subscription is scheduled to cancel at end of current term',
					},
					{
						name: 'Subscription Cancelled',
						value: 'subscription_cancelled',
						description:
							"Triggered when the subscription is cancelled. If it is cancelled due to non payment or because the card details are not present, the subscription will have the possible reason as 'cancel_reason'.",
					},
					{
						name: 'Subscription Cancelling',
						value: 'subscription_cancelling',
						description: 'Triggered 6 days prior to the scheduled cancellation date',
					},
					{
						name: 'Subscription Changed',
						value: 'subscription_changed',
						description: "Triggered when the subscription's recurring items are changed",
					},
					{
						name: 'Subscription Created',
						value: 'subscription_created',
						description: 'Triggered when a new subscription is created',
					},
					{
						name: 'Subscription Deleted',
						value: 'subscription_deleted',
						description: 'Triggered when a subscription is deleted',
					},
					{
						name: 'Subscription Reactivated',
						value: 'subscription_reactivated',
						description:
							"Triggered when the subscription is moved from cancelled state to 'Active' or 'Trial' state",
					},
					{
						name: 'Subscription Renewal Reminder',
						value: 'subscription_renewal_reminder',
						description: "Triggered 3 days before each subscription's renewal",
					},
					{
						name: 'Subscription Renewed',
						value: 'subscription_renewed',
						description: 'Triggered when the subscription is renewed from the current term',
					},
					{
						name: 'Subscription Scheduled Cancellation Removed',
						value: 'subscription_scheduled_cancellation_removed',
						description: 'Triggered when scheduled cancellation is removed for the subscription',
					},
					{
						name: 'Subscription Shipping Address Updated',
						value: 'subscription_shipping_address_updated',
						description: 'Triggered when shipping address is added or updated for a subscription',
					},
					{
						name: 'Subscription Started',
						value: 'subscription_started',
						description: "Triggered when a 'future' subscription gets started",
					},
					{
						name: 'Subscription Trial Ending',
						value: 'subscription_trial_ending',
						description: "Triggered 6 days prior to the trial period's end date",
					},
					{
						name: 'Transaction Created',
						value: 'transaction_created',
						description: 'Triggered when a transaction is recorded',
					},
					{
						name: 'Transaction Deleted',
						value: 'transaction_deleted',
						description: 'Triggered when a transaction is deleted',
					},
					{
						name: 'Transaction Updated',
						value: 'transaction_updated',
						description:
							'Triggered when a transaction is updated. E.g. (1) When a transaction is removed, (2) or when an excess payment is applied on an invoice, (3) or when amount_capturable gets updated.',
					},
				],
			},
		],
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const bodyData = this.getBodyData();
		const req = this.getRequestObject();

		const events = this.getNodeParameter('events', []) as string[];

		const eventType = bodyData.event_type as string | undefined;

		if (eventType === undefined || (!events.includes('*') && !events.includes(eventType))) {
			// If not eventType is defined or when one is defined but we are not
			// listening to it do not start the workflow.
			return {};
		}

		return {
			workflowData: [this.helpers.returnJsonArray(req.body as IDataObject[])],
		};
	}
}
