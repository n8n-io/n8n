/**
 * F39: Webhook Switch Routing
 *
 * Demonstrates webhook-driven booking validation with switch routing.
 * Validates that all required fields are present, then either creates
 * a booking or returns an error response.
 */
import { defineWorkflow, webhook } from '@n8n/engine/sdk';
import { z } from 'zod';

export default defineWorkflow({
	name: 'F39 - Webhook Switch Routing (Requires credentials)',
	triggers: [
		webhook('/f39-webhook-switch-routing', {
			method: 'POST',
			responseMode: 'respondWithNode',
			schema: {
				body: z.object({
					attendee_name: z.string().optional(),
					start: z.string().optional(),
					attendee_phone: z.string().optional(),
					attendee_email: z.string().optional(),
					attendee_company: z.string().optional(),
					notes: z.string().optional(),
					attendee_timezone: z.string().optional(),
					eventTypeId: z.string().optional(),
				}),
			},
		}),
	],
	async run(ctx) {
		const input = await ctx.step(
			{ name: 'Parse & Validate', icon: 'flag', color: '#eab308' },
			async () => {
				const { body } = ctx.triggerData;
				const hasRequiredFields =
					body.attendee_name &&
					body.start &&
					body.attendee_phone &&
					body.attendee_email &&
					body.attendee_company &&
					body.notes;
				return { body, isValid: !!hasRequiredFields };
			},
		);

		if (input.isValid) {
			const booking = await ctx.step(
				{ name: 'Create Booking', icon: 'globe', color: '#3b82f6' },
				async () => {
					const body = input.body;
					const res = await fetch('https://api.cal.com/v2/bookings', {
						method: 'POST',
						headers: {
							Authorization: 'Bearer YOUR_TOKEN_HERE',
							'Content-Type': 'application/json',
							'cal-api-version': '2024-08-13',
						},
						body: JSON.stringify({
							attendee: {
								language: 'en',
								name: body.attendee_name,
								timeZone: body.attendee_timezone,
								email: body.attendee_email,
								phoneNumber: body.attendee_phone,
							},
							start: body.start,
							eventTypeId: body.eventTypeId,
							bookingFieldsResponses: {
								phone: body.attendee_phone,
								company: body.attendee_company,
								notes: body.notes,
							},
						}),
					});
					return (await res.json()) as Record<string, unknown>;
				},
			);

			await ctx.step({ name: 'Success Response', icon: 'send', color: '#22c55e' }, async () => {
				await ctx.respondToWebhook({
					statusCode: 200,
					body: {
						message: `Meeting booked for ${input.body.start ?? ''}`,
						booking,
					},
				});
				return { responded: true };
			});
		} else {
			await ctx.step(
				{ name: 'Insufficient Data Response', icon: 'bug', color: '#ef4444' },
				async () => {
					await ctx.respondToWebhook({
						statusCode: 400,
						headers: {
							bad_request:
								'User data provided is insufficient to book a meeting. Get complete data from user and try to book the meeting again.',
						},
						body: 'User data provided is insufficient to book a meeting.',
					});
					return { responded: true };
				},
			);
		}
	},
});
