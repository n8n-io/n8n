import {
	deepCopy,
	type IDeferredPromise,
	type IRun,
	type ITriggerFunctions,
	jsonParse,
} from 'n8n-workflow';
import type { EventContext } from 'rhea';

type MessageId = string | number | Buffer | undefined;

interface HandleMessageOptions {
	lastMessageId: MessageId;
	pullMessagesNumber: number;
	jsonConvertByteArrayToString?: boolean;
	jsonParseBody?: boolean;
	onlyBody?: boolean;
	parallelProcessing?: boolean;
	sleepTime?: number;
}

export async function handleMessage(
	this: ITriggerFunctions,
	context: EventContext,
	options: HandleMessageOptions,
): Promise<{ messageId: MessageId } | null> {
	// No message in the context
	if (!context.message) {
		return null;
	}

	// ignore duplicate message check, don't think it's necessary, but it was in the rhea-lib example code
	if (context.message.message_id && context.message.message_id === options.lastMessageId) {
		return null;
	}

	let data = context.message;

	if (options.jsonConvertByteArrayToString === true && data.body.content !== undefined) {
		// The buffer is not ready... Stringify and parse back to load it.
		const cont = deepCopy(data.body.content);
		data.body = String.fromCharCode.apply(null, cont.data as number[]);
	}

	if (options.jsonConvertByteArrayToString === true && data.body.content !== undefined) {
		// The buffer is not ready... Stringify and parse back to load it.
		const content = deepCopy(data.body.content);
		data.body = String.fromCharCode.apply(null, content.data as number[]);
	}

	if (options.jsonParseBody === true) {
		data.body = jsonParse(data.body as string);
	}
	if (options.onlyBody === true) {
		data = data.body;
	}

	let responsePromise: IDeferredPromise<IRun> | undefined = undefined;
	if (!options.parallelProcessing) {
		responsePromise = this.helpers.createDeferredPromise();
	}
	if (responsePromise) {
		this.emit([this.helpers.returnJsonArray([data as any])], undefined, responsePromise);
		await responsePromise.promise;
	} else {
		this.emit([this.helpers.returnJsonArray([data as any])]);
	}

	if (!context.receiver?.has_credit()) {
		setTimeout(
			() => {
				context.receiver?.add_credit(options.pullMessagesNumber);
			},
			(options.sleepTime as number) || 10,
		);
	}
	return { messageId: context.message.message_id };
}
