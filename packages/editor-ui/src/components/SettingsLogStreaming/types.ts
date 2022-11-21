import { JsonValue } from "n8n-workflow";

export class AbstractMessageEventBusDestination {
	__type = '';
	// [key:string]: JsonValue;
	id = '';
	enabled = true;
	name = '';
	subscribedEvents: string[] = [];
	subscribedLevels: string[] = [];
}

export class MessageEventBusDestinationSyslog extends AbstractMessageEventBusDestination {
	expectedStatusCode = 200;
	host = '';
	port = 514;
	protocol = '';
	facility = '';
	app_name = '';
	eol = '';
}

export class MessageEventBusDestinationWebhook extends AbstractMessageEventBusDestination {
	url = '';
	expectedStatusCode = 200;
	responseCodeMustMatch = false;

}
