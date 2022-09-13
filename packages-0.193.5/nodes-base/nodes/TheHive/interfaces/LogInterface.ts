import { IAttachment } from './ObservableInterface';
export enum LogStatus {
	OK = 'Ok',
	DELETED = 'Deleted',
}
export interface ILog {
	// Required attributes
	id?: string;
	message?: string;
	startDate?: Date;
	status?: LogStatus;

	// Optional attributes
	attachment?: IAttachment;

	// Backend generated attributes

	createdBy?: string;
	createdAt?: Date;
	updatedBy?: string;
	upadtedAt?: Date;
}
