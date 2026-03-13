/**
 * F53: Booking Scheduler
 *
 * Demonstrates a booking scheduling workflow. The original v4 fixture
 * was skipped due to complex merge convergence with IF branching.
 * This is a semantic translation of the intent: receive a booking
 * request, check availability, and create or reject the booking.
 */
import { defineWorkflow, webhook } from '@n8n/engine/sdk';
import { z } from 'zod';

export default defineWorkflow({
	name: 'F53 - Booking Scheduler',
	triggers: [
		webhook('/f53-booking-scheduler', {
			method: 'POST',
			responseMode: 'respondWithNode',
			schema: {
				body: z.object({
					date: z.string().optional(),
					time: z.string().optional(),
					name: z.string().optional(),
					email: z.string().optional(),
					service: z.string().optional(),
				}),
			},
		}),
	],
	async run(ctx) {
		const request = await ctx.step(
			{ name: 'Parse Booking Request', icon: 'settings', color: '#6b7280' },
			async () => {
				const { body } = ctx.triggerData;
				return {
					date: body.date ?? new Date().toISOString().split('T')[0],
					time: body.time ?? '10:00',
					name: body.name ?? 'Guest',
					email: body.email ?? 'guest@example.com',
					service: body.service ?? 'default',
				};
			},
		);

		const availability = await ctx.step(
			{ name: 'Check Availability', icon: 'clock', color: '#3b82f6' },
			async () => {
				const res = await fetch('https://dummyjson.com/posts/add', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ date: request.date, time: request.time }),
				});
				const data = (await res.json()) as { available: boolean; slots: string[] };
				return data;
			},
		);

		if (availability.available) {
			const booking = await ctx.step(
				{ name: 'Create Booking', icon: 'globe', color: '#3b82f6' },
				async () => {
					const res = await fetch('https://dummyjson.com/posts/add', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							date: request.date,
							time: request.time,
							name: request.name,
							email: request.email,
							service: request.service,
						}),
					});
					return (await res.json()) as { bookingId: string; confirmed: boolean };
				},
			);

			await ctx.step({ name: 'Send Confirmation', icon: 'mail', color: '#22c55e' }, async () => {
				await fetch('https://dummyjson.com/posts/add', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						to: request.email,
						subject: 'Booking Confirmed',
						body: `Your booking for ${request.date} at ${request.time} has been confirmed. Booking ID: ${booking.bookingId}`,
					}),
				});

				await ctx.respondToWebhook({
					statusCode: 200,
					body: { confirmed: true, bookingId: booking.bookingId },
				});

				return { sent: true };
			});
		} else {
			await ctx.step({ name: 'Reject Booking', icon: 'flag', color: '#ef4444' }, async () => {
				await ctx.respondToWebhook({
					statusCode: 409,
					body: {
						confirmed: false,
						message: 'Requested time slot is not available',
						availableSlots: availability.slots,
					},
				});
				return { rejected: true };
			});
		}
	},
});
