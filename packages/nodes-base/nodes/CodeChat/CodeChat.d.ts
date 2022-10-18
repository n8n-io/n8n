
export namespace RequestBody {
	export type IError = {
		error: string | string[];
		message: string;
		statusCode: number;
	};

	export type INumbers = {
		numbers: string;
	};

	export type IOptions = {
		options: {
			messageId: string;
			mentioned: object;
			delay: number;
		};
	};

	export type IMediaData = {
		type: 'document' | 'image' | 'video' | 'sticker';
		source: string
	}

	export type IMedia = {
		caption?: string;
		url: string;
		mediaType: 'document' | 'image' | 'video' | 'sticker';
	}

	export type IButtons = {
		displayText: string;
		buttonId: string;
	}

	export type IButtonsMessage = {
		mediaData?: IMediaData;
		buttons?: {
			replyButtons: IButtons[]
		};
		buttonsMessage: {
			title: string;
			description: string;
			footerText?: string;
			buttons: IButtons[];
			mediaMessage?: IMedia
		};
	};

	export type ITemplateButtons = {
		buttonType: 'urlButton' | 'replyButton' | 'callButton';
		displayText: string;
		payload: string;
	};

	export type ITemplateMessage = {
		mediaData?: IMediaData;
		buttons?: {
			templateButtons: ITemplateButtons[];
		};
		templateMessage: {
			title: string;
			description: string;
			footerText?: string;
			buttons: ITemplateButtons[];
			mediaMessage?: IMedia
		};
	};

	export type IRow = {
		title: string;
		description: string;
		rowId: string;
	};

	export type Isection =
		| {
				title: string;
				rows: IRow[];
		  } & { rowsProperty?: { rows: IRow[] } };

	export type IListMessage = {
		listMessage: {
			title: string;
			description: string;
			footerText: string;
			buttonText: string;
			sections: Isection[];
		};
	};

	export type IContactMessage = {
		contactMessage: {
			contacts: {
				wuid: string;
				phoneNumber: string;
				fullName: string;
			}[]
		}
	}

	export type IReadMessage = {
		readMessage: {
			messageId: string;
			fromMe: boolean;
			wuid: string;
		}
	};

	export type ICreateGroup = {
		participants: string | string[];
		groupSubject: string;
		groupDescription: string;
		profilePicture?: string;
	}
}
