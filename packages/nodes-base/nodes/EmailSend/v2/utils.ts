import type {
	IDataObject,
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	INodeCredentialTestResult,
} from 'n8n-workflow';
import { createTransport } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

export type EmailSendOptions = {
	appendAttribution?: boolean;
	allowUnauthorizedCerts?: boolean;
	attachments?: string;
	ccEmail?: string;
	bccEmail?: string;
	replyTo?: string;
};

export function configureTransport(credentials: IDataObject, options: EmailSendOptions) {
	const connectionOptions: SMTPTransport.Options = {
		host: credentials.host as string,
		port: credentials.port as number,
		secure: credentials.secure as boolean,
	};

	if (credentials.secure === false) {
		connectionOptions.ignoreTLS = credentials.disableStartTls as boolean;
	}

	if (typeof credentials.hostName === 'string' && credentials.hostName) {
		connectionOptions.name = credentials.hostName;
	}

	if (credentials.user || credentials.password) {
		connectionOptions.auth = {
			user: credentials.user as string,
			pass: credentials.password as string,
		};
	}

	if (options.allowUnauthorizedCerts === true) {
		connectionOptions.tls = {
			rejectUnauthorized: false,
		};
	}

	return createTransport(connectionOptions);
}

export async function smtpConnectionTest(
	this: ICredentialTestFunctions,
	credential: ICredentialsDecrypted,
): Promise<INodeCredentialTestResult> {
	const credentials = credential.data!;
	const transporter = configureTransport(credentials, {});
	try {
		// Add 10-second timeout to prevent hanging forever
		const timeoutPromise = new Promise<never>((_, reject) => {
			setTimeout(() => reject(new Error('Connection timeout after 10 seconds')), 10000);
		});

		await Promise.race([transporter.verify(), timeoutPromise]);
		return {
			status: 'OK',
			message: 'Connection successful!',
		};
	} catch (error) {
		return {
			status: 'Error',
			message: error.message,
		};
	} finally {
		transporter.close();
	}
}
