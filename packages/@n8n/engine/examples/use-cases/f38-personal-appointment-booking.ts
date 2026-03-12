/**
 * F38: Personal Appointment Booking
 *
 * Demonstrates an appointment booking workflow. Receives a request
 * via webhook, checks whether to check availability or book an
 * appointment based on the "tool" field, and calls the Cal.com API.
 */
import { defineWorkflow, webhook } from '@n8n/engine/sdk';
import { z } from 'zod';

export default defineWorkflow({
	name: 'F38 - Personal Appointment Booking (Requires credentials)',
	triggers: [
		webhook('/f38-appointment-booking', {
			method: 'POST',
			responseMode: 'respondWithNode',
			schema: {
				body: z.object({
					tool: z.string().optional(),
					startTime: z.string().optional(),
					name: z.string().optional(),
					email: z.string().optional(),
				}),
			},
		}),
	],
	async run(ctx) {
		const input = await ctx.step({ name: 'Parse Request' }, async () => {
			const { body } = ctx.triggerData;
			return {
				tool: body.tool ?? 'checkAvailableSlot',
				startTime: body.startTime ?? new Date().toISOString(),
				name: body.name ?? 'Guest',
				email: body.email ?? 'guest@example.com',
			};
		});

		if (input.tool === 'checkAvailableSlot') {
			const availability = await ctx.step({ name: 'Check Available Slot' }, async () => {
				const calApiKey = ctx.getSecret('CAL_API_KEY') ?? '';
				const url = new URL('https://api.cal.com/v1/slots');
				url.searchParams.set('startTime', input.startTime);
				url.searchParams.set('timeZone', 'UTC');
				const res = await fetch(url.toString(), {
					headers: { Authorization: `Bearer ${calApiKey}` },
				});
				return (await res.json()) as Record<string, unknown>;
			});

			await ctx.step({ name: 'Respond with Availability' }, async () => {
				await ctx.respondToWebhook({
					statusCode: 200,
					body: availability,
				});
				return { responded: true };
			});
		} else {
			const booking = await ctx.step({ name: 'Book Appointment' }, async () => {
				const calApiKey = ctx.getSecret('CAL_API_KEY') ?? '';
				const res = await fetch('https://api.cal.com/v1/bookings', {
					method: 'POST',
					headers: {
						Authorization: `Bearer ${calApiKey}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						start: input.startTime,
						responses: { name: input.name, email: input.email },
						timeZone: 'UTC',
					}),
				});
				return (await res.json()) as Record<string, unknown>;
			});

			await ctx.step({ name: 'Respond with Booking' }, async () => {
				await ctx.respondToWebhook({
					statusCode: 200,
					body: booking,
				});
				return { responded: true };
			});
		}
	},
});
