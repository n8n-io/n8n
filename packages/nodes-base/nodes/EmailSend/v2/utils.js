import { createTransport } from 'nodemailer';
export function configureTransport(credentials, options) {
    const connectionOptions = {
        host: credentials.host,
        port: credentials.port,
        secure: credentials.secure,
    };
    if (credentials.secure === false) {
        connectionOptions.ignoreTLS = credentials.disableStartTls;
    }
    if (typeof credentials.hostName === 'string' && credentials.hostName) {
        connectionOptions.name = credentials.hostName;
    }
    if (credentials.user || credentials.password) {
        connectionOptions.auth = {
            user: credentials.user,
            pass: credentials.password,
        };
    }
    if (options.allowUnauthorizedCerts === true) {
        connectionOptions.tls = {
            rejectUnauthorized: false,
        };
    }
    return createTransport(connectionOptions, {
        disableFileAccess: true,
        disableUrlAccess: true,
    });
}
export async function smtpConnectionTest(credential) {
    const credentials = credential.data;
    const transporter = configureTransport(credentials, {});
    try {
        await transporter.verify();
        return {
            status: 'OK',
            message: 'Connection successful!',
        };
    }
    catch (error) {
        return {
            status: 'Error',
            message: error.message,
        };
    }
    finally {
        transporter.close();
    }
}
//# sourceMappingURL=utils.js.map