export interface ILicenseService {
	loadCertStr(): Promise<string>;
	getConsumerId(): string;
}
