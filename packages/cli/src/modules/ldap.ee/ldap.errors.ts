import { OperationalError, UserError } from 'n8n-workflow';

/** LDAP rejected the request outright — wrong bind DN/password/baseDn. */
export class LdapRejectionError extends UserError {}

/** Could not reach the LDAP host/port at all (network-level failure). */
export class LdapConnectionError extends OperationalError {}
