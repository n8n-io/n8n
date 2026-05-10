import { Tool } from '@n8n/agents';
import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { DateTime } from 'luxon';
import { z } from 'zod';

const DESCRIPTION =
	'Returns runtime info that the LLM cannot know on its own: ' +
	'current ISO date/time, instance timezone (IANA), and day of week. ' +
	'Call when reasoning about "today", deadlines, or scheduling.';

export function createGetEnvironmentTool() {
	return (
		new Tool('get_environment')
			.description(DESCRIPTION)
			.input(z.object({}))
			// eslint-disable-next-line @typescript-eslint/require-await -- Tool.handler() expects an async callback
			.handler(async () => {
				const timezone = Container.get(GlobalConfig).generic.timezone;
				const now = DateTime.now().setZone(timezone);
				return {
					now: now.toISO(),
					timezone,
					dayOfWeek: now.weekdayLong,
				};
			})
	);
}
