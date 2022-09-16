import {Hasura, N8nRequest} from '../Gllue/GenericFunctions';
import moment = require('moment');
import {SENDGRID_ACTIONS} from './constants';

class EmailAPI extends Hasura {
	resource = 'email';
}

export class GetEmailByTrackIdAPIEndpoint extends EmailAPI {
	action = 'by-track-id';

	getUrl(id?: string) {
		return `${this.apiHost}/${this.resource}/${this.action}/${id}`;
	}
}

class UpdateEmailByIdAPIEndpoint extends EmailAPI {
	action = 'update';
}

export class EmailNotificationService {
	getEmailByTrackIdEndpoint: GetEmailByTrackIdAPIEndpoint;
	updateEmailById: UpdateEmailByIdAPIEndpoint;

	constructor(request: N8nRequest) {
		this.getEmailByTrackIdEndpoint = new GetEmailByTrackIdAPIEndpoint(request);
		this.updateEmailById = new UpdateEmailByIdAPIEndpoint(request);
	}

	async getEmailByTrackId(id: string) {
		return await this.getEmailByTrackIdEndpoint.get(id);
	}

	buildDataByAction(action: string, timestamp: number) {
		const datetime = moment.unix(timestamp).format();
		return action === 'click' ? {is_clicked: true, clicked_at: datetime} :
			{is_opened: true, opened_at: datetime};
	}

	buildPayloadFromEvent(id: string, event: string, datetime = 0) {
		const status = {id, data: {status: event}};
		const data = this.buildDataByAction(event, datetime);
		const action = {id, data};
		return SENDGRID_ACTIONS.includes(event) ? action : status;
	}

}
