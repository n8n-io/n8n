export interface AccountInfo {
  accountId?: string | undefined;
  accountName?: string | undefined;
  emailAddress?: string | undefined;
}
export interface GetRoleCredentialsRequest {
  roleName: string | undefined;
  accountId: string | undefined;
  accessToken: string | undefined;
}
export interface RoleCredentials {
  accessKeyId?: string | undefined;
  secretAccessKey?: string | undefined;
  sessionToken?: string | undefined;
  expiration?: number | undefined;
}
export interface GetRoleCredentialsResponse {
  roleCredentials?: RoleCredentials | undefined;
}
export interface ListAccountRolesRequest {
  nextToken?: string | undefined;
  maxResults?: number | undefined;
  accessToken: string | undefined;
  accountId: string | undefined;
}
export interface RoleInfo {
  roleName?: string | undefined;
  accountId?: string | undefined;
}
export interface ListAccountRolesResponse {
  nextToken?: string | undefined;
  roleList?: RoleInfo[] | undefined;
}
export interface ListAccountsRequest {
  nextToken?: string | undefined;
  maxResults?: number | undefined;
  accessToken: string | undefined;
}
export interface ListAccountsResponse {
  nextToken?: string | undefined;
  accountList?: AccountInfo[] | undefined;
}
export interface LogoutRequest {
  accessToken: string | undefined;
}
