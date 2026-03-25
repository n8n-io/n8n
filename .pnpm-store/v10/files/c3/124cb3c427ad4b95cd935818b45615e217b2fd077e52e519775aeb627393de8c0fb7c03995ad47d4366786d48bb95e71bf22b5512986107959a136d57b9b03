import type { paths } from "@octokit/openapi-types";
import type { OctokitResponse } from "../OctokitResponse.js";
import type { RequestHeaders } from "../RequestHeaders.js";
import type { RequestRequestOptions } from "../RequestRequestOptions.js";
/**
 * @license (MIT OR CC0-1.0)
 * @source https://github.com/sindresorhus/type-fest/blob/570e27f8fdaee37ef5d5e0fbf241e0212ff8fc1a/source/simplify.d.ts
 */
export type Simplify<T> = {
    [KeyType in keyof T]: T[KeyType];
} & {};
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;
type ExtractParameters<T> = "parameters" extends keyof T ? UnionToIntersection<{
    [K in keyof T["parameters"]]-?: T["parameters"][K];
}[keyof T["parameters"]]> : {};
type ExtractRequestBody<T> = "requestBody" extends keyof T ? "content" extends keyof T["requestBody"] ? "application/json" extends keyof T["requestBody"]["content"] ? T["requestBody"]["content"]["application/json"] : {
    data: {
        [K in keyof T["requestBody"]["content"]]: T["requestBody"]["content"][K];
    }[keyof T["requestBody"]["content"]];
} : "application/json" extends keyof T["requestBody"] ? T["requestBody"]["application/json"] : {
    data: {
        [K in keyof T["requestBody"]]: T["requestBody"][K];
    }[keyof T["requestBody"]];
} : {};
type ToOctokitParameters<T> = ExtractParameters<T> & ExtractRequestBody<Required<T>>;
type Operation<Url extends keyof paths, Method extends keyof paths[Url]> = {
    parameters: Simplify<ToOctokitParameters<paths[Url][Method]>>;
    request: Method extends ReadOnlyMethods ? {
        method: Method extends string ? Uppercase<Method> : never;
        url: Url;
        headers: RequestHeaders;
        request: RequestRequestOptions;
    } : {
        method: Method extends string ? Uppercase<Method> : never;
        url: Url;
        headers: RequestHeaders;
        request: RequestRequestOptions;
        data: ExtractRequestBody<paths[Url][Method]>;
    };
    response: ExtractOctokitResponse<paths[Url][Method]>;
};
type ReadOnlyMethods = "get" | "head";
type SuccessStatuses = 200 | 201 | 202 | 204 | 205;
type RedirectStatuses = 301 | 302;
type EmptyResponseStatuses = 201 | 204 | 205;
type KnownJsonResponseTypes = "application/json" | "application/octocat-stream" | "application/scim+json" | "text/html" | "text/plain";
type SuccessResponseDataType<Responses> = {
    [K in SuccessStatuses & keyof Responses]: GetContentKeyIfPresent<Responses[K]> extends never ? never : OctokitResponse<GetContentKeyIfPresent<Responses[K]>, K>;
}[SuccessStatuses & keyof Responses];
type RedirectResponseDataType<Responses> = {
    [K in RedirectStatuses & keyof Responses]: OctokitResponse<unknown, K>;
}[RedirectStatuses & keyof Responses];
type EmptyResponseDataType<Responses> = {
    [K in EmptyResponseStatuses & keyof Responses]: OctokitResponse<never, K>;
}[EmptyResponseStatuses & keyof Responses];
type GetContentKeyIfPresent<T> = "content" extends keyof T ? DataType<T["content"]> : DataType<T>;
type DataType<T> = {
    [K in KnownJsonResponseTypes & keyof T]: T[K];
}[KnownJsonResponseTypes & keyof T];
type ExtractOctokitResponse<R> = "responses" extends keyof R ? SuccessResponseDataType<R["responses"]> extends never ? RedirectResponseDataType<R["responses"]> extends never ? EmptyResponseDataType<R["responses"]> : RedirectResponseDataType<R["responses"]> : SuccessResponseDataType<R["responses"]> : unknown;
export interface Endpoints {
    /**
     * @see https://docs.github.com/rest/apps/apps#delete-an-installation-for-the-authenticated-app
     */
    "DELETE /app/installations/{installation_id}": Operation<"/app/installations/{installation_id}", "delete">;
    /**
     * @see https://docs.github.com/rest/apps/apps#unsuspend-an-app-installation
     */
    "DELETE /app/installations/{installation_id}/suspended": Operation<"/app/installations/{installation_id}/suspended", "delete">;
    /**
     * @see https://docs.github.com/rest/apps/oauth-applications#delete-an-app-authorization
     */
    "DELETE /applications/{client_id}/grant": Operation<"/applications/{client_id}/grant", "delete">;
    /**
     * @see https://docs.github.com/rest/apps/oauth-applications#delete-an-app-token
     */
    "DELETE /applications/{client_id}/token": Operation<"/applications/{client_id}/token", "delete">;
    /**
     * @see https://docs.github.com/rest/code-security/configurations#delete-a-code-security-configuration-for-an-enterprise
     */
    "DELETE /enterprises/{enterprise}/code-security/configurations/{configuration_id}": Operation<"/enterprises/{enterprise}/code-security/configurations/{configuration_id}", "delete">;
    /**
     * @see https://docs.github.com/rest/gists/gists#delete-a-gist
     */
    "DELETE /gists/{gist_id}": Operation<"/gists/{gist_id}", "delete">;
    /**
     * @see https://docs.github.com/rest/gists/comments#delete-a-gist-comment
     */
    "DELETE /gists/{gist_id}/comments/{comment_id}": Operation<"/gists/{gist_id}/comments/{comment_id}", "delete">;
    /**
     * @see https://docs.github.com/rest/gists/gists#unstar-a-gist
     */
    "DELETE /gists/{gist_id}/star": Operation<"/gists/{gist_id}/star", "delete">;
    /**
     * @see https://docs.github.com/rest/apps/installations#revoke-an-installation-access-token
     */
    "DELETE /installation/token": Operation<"/installation/token", "delete">;
    /**
     * @see https://docs.github.com/rest/activity/notifications#mark-a-thread-as-done
     */
    "DELETE /notifications/threads/{thread_id}": Operation<"/notifications/threads/{thread_id}", "delete">;
    /**
     * @see https://docs.github.com/rest/activity/notifications#delete-a-thread-subscription
     */
    "DELETE /notifications/threads/{thread_id}/subscription": Operation<"/notifications/threads/{thread_id}/subscription", "delete">;
    /**
     * @see https://docs.github.com/rest/orgs/orgs#delete-an-organization
     */
    "DELETE /orgs/{org}": Operation<"/orgs/{org}", "delete">;
    /**
     * @see https://docs.github.com/rest/actions/hosted-runners#delete-a-github-hosted-runner-for-an-organization
     */
    "DELETE /orgs/{org}/actions/hosted-runners/{hosted_runner_id}": Operation<"/orgs/{org}/actions/hosted-runners/{hosted_runner_id}", "delete">;
    /**
     * @see https://docs.github.com/rest/actions/permissions#disable-a-selected-repository-for-github-actions-in-an-organization
     */
    "DELETE /orgs/{org}/actions/permissions/repositories/{repository_id}": Operation<"/orgs/{org}/actions/permissions/repositories/{repository_id}", "delete">;
    /**
     * @see https://docs.github.com/rest/actions/self-hosted-runner-groups#delete-a-self-hosted-runner-group-from-an-organization
     */
    "DELETE /orgs/{org}/actions/runner-groups/{runner_group_id}": Operation<"/orgs/{org}/actions/runner-groups/{runner_group_id}", "delete">;
    /**
     * @see https://docs.github.com/rest/actions/self-hosted-runner-groups#remove-repository-access-to-a-self-hosted-runner-group-in-an-organization
     */
    "DELETE /orgs/{org}/actions/runner-groups/{runner_group_id}/repositories/{repository_id}": Operation<"/orgs/{org}/actions/runner-groups/{runner_group_id}/repositories/{repository_id}", "delete">;
    /**
     * @see https://docs.github.com/rest/actions/self-hosted-runner-groups#remove-a-self-hosted-runner-from-a-group-for-an-organization
     */
    "DELETE /orgs/{org}/actions/runner-groups/{runner_group_id}/runners/{runner_id}": Operation<"/orgs/{org}/actions/runner-groups/{runner_group_id}/runners/{runner_id}", "delete">;
    /**
     * @see https://docs.github.com/rest/actions/self-hosted-runners#delete-a-self-hosted-runner-from-an-organization
     */
    "DELETE /orgs/{org}/actions/runners/{runner_id}": Operation<"/orgs/{org}/actions/runners/{runner_id}", "delete">;
    /**
     * @see https://docs.github.com/rest/actions/self-hosted-runners#remove-all-custom-labels-from-a-self-hosted-runner-for-an-organization
     */
    "DELETE /orgs/{org}/actions/runners/{runner_id}/labels": Operation<"/orgs/{org}/actions/runners/{runner_id}/labels", "delete">;
    /**
     * @see https://docs.github.com/rest/actions/self-hosted-runners#remove-a-custom-label-from-a-self-hosted-runner-for-an-organization
     */
    "DELETE /orgs/{org}/actions/runners/{runner_id}/labels/{name}": Operation<"/orgs/{org}/actions/runners/{runner_id}/labels/{name}", "delete">;
    /**
     * @see https://docs.github.com/rest/actions/secrets#delete-an-organization-secret
     */
    "DELETE /orgs/{org}/actions/secrets/{secret_name}": Operation<"/orgs/{org}/actions/secrets/{secret_name}", "delete">;
    /**
     * @see https://docs.github.com/rest/actions/secrets#remove-selected-repository-from-an-organization-secret
     */
    "DELETE /orgs/{org}/actions/secrets/{secret_name}/repositories/{repository_id}": Operation<"/orgs/{org}/actions/secrets/{secret_name}/repositories/{repository_id}", "delete">;
    /**
     * @see https://docs.github.com/rest/actions/variables#delete-an-organization-variable
     */
    "DELETE /orgs/{org}/actions/variables/{name}": Operation<"/orgs/{org}/actions/variables/{name}", "delete">;
    /**
     * @see https://docs.github.com/rest/actions/variables#remove-selected-repository-from-an-organization-variable
     */
    "DELETE /orgs/{org}/actions/variables/{name}/repositories/{repository_id}": Operation<"/orgs/{org}/actions/variables/{name}/repositories/{repository_id}", "delete">;
    /**
     * @see https://docs.github.com/rest/orgs/blocking#unblock-a-user-from-an-organization
     */
    "DELETE /orgs/{org}/blocks/{username}": Operation<"/orgs/{org}/blocks/{username}", "delete">;
    /**
     * @see https://docs.github.com/rest/code-security/configurations#detach-configurations-from-repositories
     */
    "DELETE /orgs/{org}/code-security/configurations/detach": Operation<"/orgs/{org}/code-security/configurations/detach", "delete">;
    /**
     * @see https://docs.github.com/rest/code-security/configurations#delete-a-code-security-configuration
     */
    "DELETE /orgs/{org}/code-security/configurations/{configuration_id}": Operation<"/orgs/{org}/code-security/configurations/{configuration_id}", "delete">;
    /**
     * @see https://docs.github.com/rest/codespaces/organizations#remove-users-from-codespaces-access-for-an-organization
     */
    "DELETE /orgs/{org}/codespaces/access/selected_users": Operation<"/orgs/{org}/codespaces/access/selected_users", "delete">;
    /**
     * @see https://docs.github.com/rest/codespaces/organization-secrets#delete-an-organization-secret
     */
    "DELETE /orgs/{org}/codespaces/secrets/{secret_name}": Operation<"/orgs/{org}/codespaces/secrets/{secret_name}", "delete">;
    /**
     * @see https://docs.github.com/rest/codespaces/organization-secrets#remove-selected-repository-from-an-organization-secret
     */
    "DELETE /orgs/{org}/codespaces/secrets/{secret_name}/repositories/{repository_id}": Operation<"/orgs/{org}/codespaces/secrets/{secret_name}/repositories/{repository_id}", "delete">;
    /**
     * @see https://docs.github.com/rest/copilot/copilot-user-management#remove-teams-from-the-copilot-subscription-for-an-organization
     */
    "DELETE /orgs/{org}/copilot/billing/selected_teams": Operation<"/orgs/{org}/copilot/billing/selected_teams", "delete">;
    /**
     * @see https://docs.github.com/rest/copilot/copilot-user-management#remove-users-from-the-copilot-subscription-for-an-organization
     */
    "DELETE /orgs/{org}/copilot/billing/selected_users": Operation<"/orgs/{org}/copilot/billing/selected_users", "delete">;
    /**
     * @see https://docs.github.com/rest/dependabot/secrets#delete-an-organization-secret
     */
    "DELETE /orgs/{org}/dependabot/secrets/{secret_name}": Operation<"/orgs/{org}/dependabot/secrets/{secret_name}", "delete">;
    /**
     * @see https://docs.github.com/rest/dependabot/secrets#remove-selected-repository-from-an-organization-secret
     */
    "DELETE /orgs/{org}/dependabot/secrets/{secret_name}/repositories/{repository_id}": Operation<"/orgs/{org}/dependabot/secrets/{secret_name}/repositories/{repository_id}", "delete">;
    /**
     * @see https://docs.github.com/rest/orgs/webhooks#delete-an-organization-webhook
     */
    "DELETE /orgs/{org}/hooks/{hook_id}": Operation<"/orgs/{org}/hooks/{hook_id}", "delete">;
    /**
     * @see https://docs.github.com/rest/interactions/orgs#remove-interaction-restrictions-for-an-organization
     */
    "DELETE /orgs/{org}/interaction-limits": Operation<"/orgs/{org}/interaction-limits", "delete">;
    /**
     * @see https://docs.github.com/rest/orgs/members#cancel-an-organization-invitation
     */
    "DELETE /orgs/{org}/invitations/{invitation_id}": Operation<"/orgs/{org}/invitations/{invitation_id}", "delete">;
    /**
     * @see https://docs.github.com/rest/orgs/issue-types#delete-issue-type-for-an-organization
     */
    "DELETE /orgs/{org}/issue-types/{issue_type_id}": Operation<"/orgs/{org}/issue-types/{issue_type_id}", "delete">;
    /**
     * @see https://docs.github.com/rest/orgs/members#remove-an-organization-member
     */
    "DELETE /orgs/{org}/members/{username}": Operation<"/orgs/{org}/members/{username}", "delete">;
    /**
     * @see https://docs.github.com/rest/codespaces/organizations#delete-a-codespace-from-the-organization
     */
    "DELETE /orgs/{org}/members/{username}/codespaces/{codespace_name}": Operation<"/orgs/{org}/members/{username}/codespaces/{codespace_name}", "delete">;
    /**
     * @see https://docs.github.com/rest/orgs/members#remove-organization-membership-for-a-user
     */
    "DELETE /orgs/{org}/memberships/{username}": Operation<"/orgs/{org}/memberships/{username}", "delete">;
    /**
     * @see https://docs.github.com/rest/migrations/orgs#delete-an-organization-migration-archive
     */
    "DELETE /orgs/{org}/migrations/{migration_id}/archive": Operation<"/orgs/{org}/migrations/{migration_id}/archive", "delete">;
    /**
     * @see https://docs.github.com/rest/migrations/orgs#unlock-an-organization-repository
     */
    "DELETE /orgs/{org}/migrations/{migration_id}/repos/{repo_name}/lock": Operation<"/orgs/{org}/migrations/{migration_id}/repos/{repo_name}/lock", "delete">;
    /**
     * @see https://docs.github.com/rest/orgs/organization-roles#remove-all-organization-roles-for-a-team
     */
    "DELETE /orgs/{org}/organization-roles/teams/{team_slug}": Operation<"/orgs/{org}/organization-roles/teams/{team_slug}", "delete">;
    /**
     * @see https://docs.github.com/rest/orgs/organization-roles#remove-an-organization-role-from-a-team
     */
    "DELETE /orgs/{org}/organization-roles/teams/{team_slug}/{role_id}": Operation<"/orgs/{org}/organization-roles/teams/{team_slug}/{role_id}", "delete">;
    /**
     * @see https://docs.github.com/rest/orgs/organization-roles#remove-all-organization-roles-for-a-user
     */
    "DELETE /orgs/{org}/organization-roles/users/{username}": Operation<"/orgs/{org}/organization-roles/users/{username}", "delete">;
    /**
     * @see https://docs.github.com/rest/orgs/organization-roles#remove-an-organization-role-from-a-user
     */
    "DELETE /orgs/{org}/organization-roles/users/{username}/{role_id}": Operation<"/orgs/{org}/organization-roles/users/{username}/{role_id}", "delete">;
    /**
     * @see https://docs.github.com/rest/orgs/outside-collaborators#remove-outside-collaborator-from-an-organization
     */
    "DELETE /orgs/{org}/outside_collaborators/{username}": Operation<"/orgs/{org}/outside_collaborators/{username}", "delete">;
    /**
     * @see https://docs.github.com/rest/packages/packages#delete-a-package-for-an-organization
     */
    "DELETE /orgs/{org}/packages/{package_type}/{package_name}": Operation<"/orgs/{org}/packages/{package_type}/{package_name}", "delete">;
    /**
     * @see https://docs.github.com/rest/packages/packages#delete-package-version-for-an-organization
     */
    "DELETE /orgs/{org}/packages/{package_type}/{package_name}/versions/{package_version_id}": Operation<"/orgs/{org}/packages/{package_type}/{package_name}/versions/{package_version_id}", "delete">;
    /**
     * @see https://docs.github.com/rest/private-registries/organization-configurations#delete-a-private-registry-for-an-organization
     */
    "DELETE /orgs/{org}/private-registries/{secret_name}": Operation<"/orgs/{org}/private-registries/{secret_name}", "delete">;
    /**
     * @see https://docs.github.com/rest/orgs/custom-properties#remove-a-custom-property-for-an-organization
     */
    "DELETE /orgs/{org}/properties/schema/{custom_property_name}": Operation<"/orgs/{org}/properties/schema/{custom_property_name}", "delete">;
    /**
     * @see https://docs.github.com/rest/orgs/members#remove-public-organization-membership-for-the-authenticated-user
     */
    "DELETE /orgs/{org}/public_members/{username}": Operation<"/orgs/{org}/public_members/{username}", "delete">;
    /**
     * @see https://docs.github.com/rest/orgs/rules#delete-an-organization-repository-ruleset
     */
    "DELETE /orgs/{org}/rulesets/{ruleset_id}": Operation<"/orgs/{org}/rulesets/{ruleset_id}", "delete">;
    /**
     * @see https://docs.github.com/rest/orgs/security-managers#remove-a-security-manager-team
     */
    "DELETE /orgs/{org}/security-managers/teams/{team_slug}": Operation<"/orgs/{org}/security-managers/teams/{team_slug}", "delete">;
    /**
     * @see https://docs.github.com/rest/orgs/network-configurations#delete-a-hosted-compute-network-configuration-from-an-organization
     */
    "DELETE /orgs/{org}/settings/network-configurations/{network_configuration_id}": Operation<"/orgs/{org}/settings/network-configurations/{network_configuration_id}", "delete">;
    /**
     * @see https://docs.github.com/rest/teams/teams#delete-a-team
     */
    "DELETE /orgs/{org}/teams/{team_slug}": Operation<"/orgs/{org}/teams/{team_slug}", "delete">;
    /**
     * @see https://docs.github.com/rest/teams/discussions#delete-a-discussion
     */
    "DELETE /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}": Operation<"/orgs/{org}/teams/{team_slug}/discussions/{discussion_number}", "delete">;
    /**
     * @see https://docs.github.com/rest/teams/discussion-comments#delete-a-discussion-comment
     */
    "DELETE /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments/{comment_number}": Operation<"/orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments/{comment_number}", "delete">;
    /**
     * @see https://docs.github.com/rest/reactions/reactions#delete-team-discussion-comment-reaction
     */
    "DELETE /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments/{comment_number}/reactions/{reaction_id}": Operation<"/orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments/{comment_number}/reactions/{reaction_id}", "delete">;
    /**
     * @see https://docs.github.com/rest/reactions/reactions#delete-team-discussion-reaction
     */
    "DELETE /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/reactions/{reaction_id}": Operation<"/orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/reactions/{reaction_id}", "delete">;
    /**
     * @see https://docs.github.com/rest/teams/members#remove-team-membership-for-a-user
     */
    "DELETE /orgs/{org}/teams/{team_slug}/memberships/{username}": Operation<"/orgs/{org}/teams/{team_slug}/memberships/{username}", "delete">;
    /**
     * @see https://docs.github.com/rest/teams/teams#remove-a-project-from-a-team
     */
    "DELETE /orgs/{org}/teams/{team_slug}/projects/{project_id}": Operation<"/orgs/{org}/teams/{team_slug}/projects/{project_id}", "delete">;
    /**
     * @see https://docs.github.com/rest/teams/teams#remove-a-repository-from-a-team
     */
    "DELETE /orgs/{org}/teams/{team_slug}/repos/{owner}/{repo}": Operation<"/orgs/{org}/teams/{team_slug}/repos/{owner}/{repo}", "delete">;
    /**
     * @see https://docs.github.com/rest/projects/cards#delete-a-project-card
     */
    "DELETE /projects/columns/cards/{card_id}": Operation<"/projects/columns/cards/{card_id}", "delete">;
    /**
     * @see https://docs.github.com/rest/projects/columns#delete-a-project-column
     */
    "DELETE /projects/columns/{column_id}": Operation<"/projects/columns/{column_id}", "delete">;
    /**
     * @see https://docs.github.com/rest/projects/projects#delete-a-project
     */
    "DELETE /projects/{project_id}": Operation<"/projects/{project_id}", "delete">;
    /**
     * @see https://docs.github.com/rest/projects/collaborators#remove-user-as-a-collaborator
     */
    "DELETE /projects/{project_id}/collaborators/{username}": Operation<"/projects/{project_id}/collaborators/{username}", "delete">;
    /**
     * @see https://docs.github.com/rest/repos/repos#delete-a-repository
     */
    "DELETE /repos/{owner}/{repo}": Operation<"/repos/{owner}/{repo}", "delete">;
    /**
     * @see https://docs.github.com/rest/actions/artifacts#delete-an-artifact
     */
    "DELETE /repos/{owner}/{repo}/actions/artifacts/{artifact_id}": Operation<"/repos/{owner}/{repo}/actions/artifacts/{artifact_id}", "delete">;
    /**
     * @see https://docs.github.com/rest/actions/cache#delete-a-github-actions-cache-for-a-repository-using-a-cache-id
     */
    "DELETE /repos/{owner}/{repo}/actions/caches/{cache_id}": Operation<"/repos/{owner}/{repo}/actions/caches/{cache_id}", "delete">;
    /**
     * @see https://docs.github.com/rest/actions/cache#delete-github-actions-caches-for-a-repository-using-a-cache-key
     */
    "DELETE /repos/{owner}/{repo}/actions/caches{?key,ref}": Operation<"/repos/{owner}/{repo}/actions/caches", "delete">;
    /**
     * @see https://docs.github.com/rest/actions/self-hosted-runners#delete-a-self-hosted-runner-from-a-repository
     */
    "DELETE /repos/{owner}/{repo}/actions/runners/{runner_id}": Operation<"/repos/{owner}/{repo}/actions/runners/{runner_id}", "delete">;
    /**
     * @see https://docs.github.com/rest/actions/self-hosted-runners#remove-all-custom-labels-from-a-self-hosted-runner-for-a-repository
     */
    "DELETE /repos/{owner}/{repo}/actions/runners/{runner_id}/labels": Operation<"/repos/{owner}/{repo}/actions/runners/{runner_id}/labels", "delete">;
    /**
     * @see https://docs.github.com/rest/actions/self-hosted-runners#remove-a-custom-label-from-a-self-hosted-runner-for-a-repository
     */
    "DELETE /repos/{owner}/{repo}/actions/runners/{runner_id}/labels/{name}": Operation<"/repos/{owner}/{repo}/actions/runners/{runner_id}/labels/{name}", "delete">;
    /**
     * @see https://docs.github.com/rest/actions/workflow-runs#delete-a-workflow-run
     */
    "DELETE /repos/{owner}/{repo}/actions/runs/{run_id}": Operation<"/repos/{owner}/{repo}/actions/runs/{run_id}", "delete">;
    /**
     * @see https://docs.github.com/rest/actions/workflow-runs#delete-workflow-run-logs
     */
    "DELETE /repos/{owner}/{repo}/actions/runs/{run_id}/logs": Operation<"/repos/{owner}/{repo}/actions/runs/{run_id}/logs", "delete">;
    /**
     * @see https://docs.github.com/rest/actions/secrets#delete-a-repository-secret
     */
    "DELETE /repos/{owner}/{repo}/actions/secrets/{secret_name}": Operation<"/repos/{owner}/{repo}/actions/secrets/{secret_name}", "delete">;
    /**
     * @see https://docs.github.com/rest/actions/variables#delete-a-repository-variable
     */
    "DELETE /repos/{owner}/{repo}/actions/variables/{name}": Operation<"/repos/{owner}/{repo}/actions/variables/{name}", "delete">;
    /**
     * @see https://docs.github.com/rest/repos/autolinks#delete-an-autolink-reference-from-a-repository
     */
    "DELETE /repos/{owner}/{repo}/autolinks/{autolink_id}": Operation<"/repos/{owner}/{repo}/autolinks/{autolink_id}", "delete">;
    /**
     * @see https://docs.github.com/rest/repos/repos#disable-dependabot-security-updates
     */
    "DELETE /repos/{owner}/{repo}/automated-security-fixes": Operation<"/repos/{owner}/{repo}/automated-security-fixes", "delete">;
    /**
     * @see https://docs.github.com/rest/branches/branch-protection#delete-branch-protection
     */
    "DELETE /repos/{owner}/{repo}/branches/{branch}/protection": Operation<"/repos/{owner}/{repo}/branches/{branch}/protection", "delete">;
    /**
     * @see https://docs.github.com/rest/branches/branch-protection#delete-admin-branch-protection
     */
    "DELETE /repos/{owner}/{repo}/branches/{branch}/protection/enforce_admins": Operation<"/repos/{owner}/{repo}/branches/{branch}/protection/enforce_admins", "delete">;
    /**
     * @see https://docs.github.com/rest/branches/branch-protection#delete-pull-request-review-protection
     */
    "DELETE /repos/{owner}/{repo}/branches/{branch}/protection/required_pull_request_reviews": Operation<"/repos/{owner}/{repo}/branches/{branch}/protection/required_pull_request_reviews", "delete">;
    /**
     * @see https://docs.github.com/rest/branches/branch-protection#delete-commit-signature-protection
     */
    "DELETE /repos/{owner}/{repo}/branches/{branch}/protection/required_signatures": Operation<"/repos/{owner}/{repo}/branches/{branch}/protection/required_signatures", "delete">;
    /**
     * @see https://docs.github.com/rest/branches/branch-protection#remove-status-check-protection
     */
    "DELETE /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks": Operation<"/repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks", "delete">;
    /**
     * @see https://docs.github.com/rest/branches/branch-protection#remove-status-check-contexts
     */
    "DELETE /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks/contexts": Operation<"/repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks/contexts", "delete">;
    /**
     * @see https://docs.github.com/rest/branches/branch-protection#delete-access-restrictions
     */
    "DELETE /repos/{owner}/{repo}/branches/{branch}/protection/restrictions": Operation<"/repos/{owner}/{repo}/branches/{branch}/protection/restrictions", "delete">;
    /**
     * @see https://docs.github.com/rest/branches/branch-protection#remove-app-access-restrictions
     */
    "DELETE /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/apps": Operation<"/repos/{owner}/{repo}/branches/{branch}/protection/restrictions/apps", "delete">;
    /**
     * @see https://docs.github.com/rest/branches/branch-protection#remove-team-access-restrictions
     */
    "DELETE /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/teams": Operation<"/repos/{owner}/{repo}/branches/{branch}/protection/restrictions/teams", "delete">;
    /**
     * @see https://docs.github.com/rest/branches/branch-protection#remove-user-access-restrictions
     */
    "DELETE /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/users": Operation<"/repos/{owner}/{repo}/branches/{branch}/protection/restrictions/users", "delete">;
    /**
     * @see https://docs.github.com/rest/code-scanning/code-scanning#delete-a-code-scanning-analysis-from-a-repository
     */
    "DELETE /repos/{owner}/{repo}/code-scanning/analyses/{analysis_id}{?confirm_delete}": Operation<"/repos/{owner}/{repo}/code-scanning/analyses/{analysis_id}", "delete">;
    /**
     * @see https://docs.github.com/rest/code-scanning/code-scanning#delete-a-codeql-database
     */
    "DELETE /repos/{owner}/{repo}/code-scanning/codeql/databases/{language}": Operation<"/repos/{owner}/{repo}/code-scanning/codeql/databases/{language}", "delete">;
    /**
     * @see https://docs.github.com/rest/codespaces/repository-secrets#delete-a-repository-secret
     */
    "DELETE /repos/{owner}/{repo}/codespaces/secrets/{secret_name}": Operation<"/repos/{owner}/{repo}/codespaces/secrets/{secret_name}", "delete">;
    /**
     * @see https://docs.github.com/rest/collaborators/collaborators#remove-a-repository-collaborator
     */
    "DELETE /repos/{owner}/{repo}/collaborators/{username}": Operation<"/repos/{owner}/{repo}/collaborators/{username}", "delete">;
    /**
     * @see https://docs.github.com/rest/commits/comments#delete-a-commit-comment
     */
    "DELETE /repos/{owner}/{repo}/comments/{comment_id}": Operation<"/repos/{owner}/{repo}/comments/{comment_id}", "delete">;
    /**
     * @see https://docs.github.com/rest/reactions/reactions#delete-a-commit-comment-reaction
     */
    "DELETE /repos/{owner}/{repo}/comments/{comment_id}/reactions/{reaction_id}": Operation<"/repos/{owner}/{repo}/comments/{comment_id}/reactions/{reaction_id}", "delete">;
    /**
     * @see https://docs.github.com/rest/repos/contents#delete-a-file
     */
    "DELETE /repos/{owner}/{repo}/contents/{path}": Operation<"/repos/{owner}/{repo}/contents/{path}", "delete">;
    /**
     * @see https://docs.github.com/rest/dependabot/secrets#delete-a-repository-secret
     */
    "DELETE /repos/{owner}/{repo}/dependabot/secrets/{secret_name}": Operation<"/repos/{owner}/{repo}/dependabot/secrets/{secret_name}", "delete">;
    /**
     * @see https://docs.github.com/rest/deployments/deployments#delete-a-deployment
     */
    "DELETE /repos/{owner}/{repo}/deployments/{deployment_id}": Operation<"/repos/{owner}/{repo}/deployments/{deployment_id}", "delete">;
    /**
     * @see https://docs.github.com/rest/deployments/environments#delete-an-environment
     */
    "DELETE /repos/{owner}/{repo}/environments/{environment_name}": Operation<"/repos/{owner}/{repo}/environments/{environment_name}", "delete">;
    /**
     * @see https://docs.github.com/rest/deployments/branch-policies#delete-a-deployment-branch-policy
     */
    "DELETE /repos/{owner}/{repo}/environments/{environment_name}/deployment-branch-policies/{branch_policy_id}": Operation<"/repos/{owner}/{repo}/environments/{environment_name}/deployment-branch-policies/{branch_policy_id}", "delete">;
    /**
     * @see https://docs.github.com/rest/deployments/protection-rules#disable-a-custom-protection-rule-for-an-environment
     */
    "DELETE /repos/{owner}/{repo}/environments/{environment_name}/deployment_protection_rules/{protection_rule_id}": Operation<"/repos/{owner}/{repo}/environments/{environment_name}/deployment_protection_rules/{protection_rule_id}", "delete">;
    /**
     * @see https://docs.github.com/rest/actions/secrets#delete-an-environment-secret
     */
    "DELETE /repos/{owner}/{repo}/environments/{environment_name}/secrets/{secret_name}": Operation<"/repos/{owner}/{repo}/environments/{environment_name}/secrets/{secret_name}", "delete">;
    /**
     * @see https://docs.github.com/rest/actions/variables#delete-an-environment-variable
     */
    "DELETE /repos/{owner}/{repo}/environments/{environment_name}/variables/{name}": Operation<"/repos/{owner}/{repo}/environments/{environment_name}/variables/{name}", "delete">;
    /**
     * @see https://docs.github.com/rest/git/refs#delete-a-reference
     */
    "DELETE /repos/{owner}/{repo}/git/refs/{ref}": Operation<"/repos/{owner}/{repo}/git/refs/{ref}", "delete">;
    /**
     * @see https://docs.github.com/rest/repos/webhooks#delete-a-repository-webhook
     */
    "DELETE /repos/{owner}/{repo}/hooks/{hook_id}": Operation<"/repos/{owner}/{repo}/hooks/{hook_id}", "delete">;
    /**
     * @see https://docs.github.com/rest/migrations/source-imports#cancel-an-import
     */
    "DELETE /repos/{owner}/{repo}/import": Operation<"/repos/{owner}/{repo}/import", "delete">;
    /**
     * @see https://docs.github.com/rest/interactions/repos#remove-interaction-restrictions-for-a-repository
     */
    "DELETE /repos/{owner}/{repo}/interaction-limits": Operation<"/repos/{owner}/{repo}/interaction-limits", "delete">;
    /**
     * @see https://docs.github.com/rest/collaborators/invitations#delete-a-repository-invitation
     */
    "DELETE /repos/{owner}/{repo}/invitations/{invitation_id}": Operation<"/repos/{owner}/{repo}/invitations/{invitation_id}", "delete">;
    /**
     * @see https://docs.github.com/rest/issues/comments#delete-an-issue-comment
     */
    "DELETE /repos/{owner}/{repo}/issues/comments/{comment_id}": Operation<"/repos/{owner}/{repo}/issues/comments/{comment_id}", "delete">;
    /**
     * @see https://docs.github.com/rest/reactions/reactions#delete-an-issue-comment-reaction
     */
    "DELETE /repos/{owner}/{repo}/issues/comments/{comment_id}/reactions/{reaction_id}": Operation<"/repos/{owner}/{repo}/issues/comments/{comment_id}/reactions/{reaction_id}", "delete">;
    /**
     * @see https://docs.github.com/rest/reference/issues#remove-assignees-from-an-issue
     */
    "DELETE /repos/{owner}/{repo}/issues/{issue_number}/assignees": Operation<"/repos/{owner}/{repo}/issues/{issue_number}/assignees", "delete">;
    /**
     * @see https://docs.github.com/rest/issues/labels#remove-all-labels-from-an-issue
     */
    "DELETE /repos/{owner}/{repo}/issues/{issue_number}/labels": Operation<"/repos/{owner}/{repo}/issues/{issue_number}/labels", "delete">;
    /**
     * @see https://docs.github.com/rest/issues/labels#remove-a-label-from-an-issue
     */
    "DELETE /repos/{owner}/{repo}/issues/{issue_number}/labels/{name}": Operation<"/repos/{owner}/{repo}/issues/{issue_number}/labels/{name}", "delete">;
    /**
     * @see https://docs.github.com/rest/issues/issues#unlock-an-issue
     */
    "DELETE /repos/{owner}/{repo}/issues/{issue_number}/lock": Operation<"/repos/{owner}/{repo}/issues/{issue_number}/lock", "delete">;
    /**
     * @see https://docs.github.com/rest/reactions/reactions#delete-an-issue-reaction
     */
    "DELETE /repos/{owner}/{repo}/issues/{issue_number}/reactions/{reaction_id}": Operation<"/repos/{owner}/{repo}/issues/{issue_number}/reactions/{reaction_id}", "delete">;
    /**
     * @see https://docs.github.com/rest/issues/sub-issues#remove-sub-issue
     */
    "DELETE /repos/{owner}/{repo}/issues/{issue_number}/sub_issue": Operation<"/repos/{owner}/{repo}/issues/{issue_number}/sub_issue", "delete">;
    /**
     * @see https://docs.github.com/rest/deploy-keys/deploy-keys#delete-a-deploy-key
     */
    "DELETE /repos/{owner}/{repo}/keys/{key_id}": Operation<"/repos/{owner}/{repo}/keys/{key_id}", "delete">;
    /**
     * @see https://docs.github.com/rest/issues/labels#delete-a-label
     */
    "DELETE /repos/{owner}/{repo}/labels/{name}": Operation<"/repos/{owner}/{repo}/labels/{name}", "delete">;
    /**
     * @see https://docs.github.com/rest/issues/milestones#delete-a-milestone
     */
    "DELETE /repos/{owner}/{repo}/milestones/{milestone_number}": Operation<"/repos/{owner}/{repo}/milestones/{milestone_number}", "delete">;
    /**
     * @see https://docs.github.com/rest/pages/pages#delete-a-apiname-pages-site
     */
    "DELETE /repos/{owner}/{repo}/pages": Operation<"/repos/{owner}/{repo}/pages", "delete">;
    /**
     * @see https://docs.github.com/rest/repos/repos#disable-private-vulnerability-reporting-for-a-repository
     */
    "DELETE /repos/{owner}/{repo}/private-vulnerability-reporting": Operation<"/repos/{owner}/{repo}/private-vulnerability-reporting", "delete">;
    /**
     * @see https://docs.github.com/rest/pulls/comments#delete-a-review-comment-for-a-pull-request
     */
    "DELETE /repos/{owner}/{repo}/pulls/comments/{comment_id}": Operation<"/repos/{owner}/{repo}/pulls/comments/{comment_id}", "delete">;
    /**
     * @see https://docs.github.com/rest/reactions/reactions#delete-a-pull-request-comment-reaction
     */
    "DELETE /repos/{owner}/{repo}/pulls/comments/{comment_id}/reactions/{reaction_id}": Operation<"/repos/{owner}/{repo}/pulls/comments/{comment_id}/reactions/{reaction_id}", "delete">;
    /**
     * @see https://docs.github.com/rest/pulls/review-requests#remove-requested-reviewers-from-a-pull-request
     */
    "DELETE /repos/{owner}/{repo}/pulls/{pull_number}/requested_reviewers": Operation<"/repos/{owner}/{repo}/pulls/{pull_number}/requested_reviewers", "delete">;
    /**
     * @see https://docs.github.com/rest/pulls/reviews#delete-a-pending-review-for-a-pull-request
     */
    "DELETE /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}": Operation<"/repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}", "delete">;
    /**
     * @see https://docs.github.com/rest/releases/assets#delete-a-release-asset
     */
    "DELETE /repos/{owner}/{repo}/releases/assets/{asset_id}": Operation<"/repos/{owner}/{repo}/releases/assets/{asset_id}", "delete">;
    /**
     * @see https://docs.github.com/rest/releases/releases#delete-a-release
     */
    "DELETE /repos/{owner}/{repo}/releases/{release_id}": Operation<"/repos/{owner}/{repo}/releases/{release_id}", "delete">;
    /**
     * @see https://docs.github.com/rest/reactions/reactions#delete-a-release-reaction
     */
    "DELETE /repos/{owner}/{repo}/releases/{release_id}/reactions/{reaction_id}": Operation<"/repos/{owner}/{repo}/releases/{release_id}/reactions/{reaction_id}", "delete">;
    /**
     * @see https://docs.github.com/rest/repos/rules#delete-a-repository-ruleset
     */
    "DELETE /repos/{owner}/{repo}/rulesets/{ruleset_id}": Operation<"/repos/{owner}/{repo}/rulesets/{ruleset_id}", "delete">;
    /**
     * @see https://docs.github.com/rest/activity/watching#delete-a-repository-subscription
     */
    "DELETE /repos/{owner}/{repo}/subscription": Operation<"/repos/{owner}/{repo}/subscription", "delete">;
    /**
     * @see https://docs.github.com/rest/repos/tags#closing-down---delete-a-tag-protection-state-for-a-repository
     */
    "DELETE /repos/{owner}/{repo}/tags/protection/{tag_protection_id}": Operation<"/repos/{owner}/{repo}/tags/protection/{tag_protection_id}", "delete">;
    /**
     * @see https://docs.github.com/rest/repos/repos#disable-vulnerability-alerts
     */
    "DELETE /repos/{owner}/{repo}/vulnerability-alerts": Operation<"/repos/{owner}/{repo}/vulnerability-alerts", "delete">;
    /**
     * @see https://docs.github.com/rest/teams/teams#delete-a-team-legacy
     */
    "DELETE /teams/{team_id}": Operation<"/teams/{team_id}", "delete">;
    /**
     * @see https://docs.github.com/rest/teams/discussions#delete-a-discussion-legacy
     */
    "DELETE /teams/{team_id}/discussions/{discussion_number}": Operation<"/teams/{team_id}/discussions/{discussion_number}", "delete">;
    /**
     * @see https://docs.github.com/rest/teams/discussion-comments#delete-a-discussion-comment-legacy
     */
    "DELETE /teams/{team_id}/discussions/{discussion_number}/comments/{comment_number}": Operation<"/teams/{team_id}/discussions/{discussion_number}/comments/{comment_number}", "delete">;
    /**
     * @see https://docs.github.com/rest/teams/members#remove-team-member-legacy
     */
    "DELETE /teams/{team_id}/members/{username}": Operation<"/teams/{team_id}/members/{username}", "delete">;
    /**
     * @see https://docs.github.com/rest/teams/members#remove-team-membership-for-a-user-legacy
     */
    "DELETE /teams/{team_id}/memberships/{username}": Operation<"/teams/{team_id}/memberships/{username}", "delete">;
    /**
     * @see https://docs.github.com/rest/teams/teams#remove-a-project-from-a-team-legacy
     */
    "DELETE /teams/{team_id}/projects/{project_id}": Operation<"/teams/{team_id}/projects/{project_id}", "delete">;
    /**
     * @see https://docs.github.com/rest/teams/teams#remove-a-repository-from-a-team-legacy
     */
    "DELETE /teams/{team_id}/repos/{owner}/{repo}": Operation<"/teams/{team_id}/repos/{owner}/{repo}", "delete">;
    /**
     * @see https://docs.github.com/rest/users/blocking#unblock-a-user
     */
    "DELETE /user/blocks/{username}": Operation<"/user/blocks/{username}", "delete">;
    /**
     * @see https://docs.github.com/rest/codespaces/secrets#delete-a-secret-for-the-authenticated-user
     */
    "DELETE /user/codespaces/secrets/{secret_name}": Operation<"/user/codespaces/secrets/{secret_name}", "delete">;
    /**
     * @see https://docs.github.com/rest/codespaces/secrets#remove-a-selected-repository-from-a-user-secret
     */
    "DELETE /user/codespaces/secrets/{secret_name}/repositories/{repository_id}": Operation<"/user/codespaces/secrets/{secret_name}/repositories/{repository_id}", "delete">;
    /**
     * @see https://docs.github.com/rest/codespaces/codespaces#delete-a-codespace-for-the-authenticated-user
     */
    "DELETE /user/codespaces/{codespace_name}": Operation<"/user/codespaces/{codespace_name}", "delete">;
    /**
     * @see https://docs.github.com/rest/users/emails#delete-an-email-address-for-the-authenticated-user
     */
    "DELETE /user/emails": Operation<"/user/emails", "delete">;
    /**
     * @see https://docs.github.com/rest/users/followers#unfollow-a-user
     */
    "DELETE /user/following/{username}": Operation<"/user/following/{username}", "delete">;
    /**
     * @see https://docs.github.com/rest/users/gpg-keys#delete-a-gpg-key-for-the-authenticated-user
     */
    "DELETE /user/gpg_keys/{gpg_key_id}": Operation<"/user/gpg_keys/{gpg_key_id}", "delete">;
    /**
     * @see https://docs.github.com/rest/apps/installations#remove-a-repository-from-an-app-installation
     */
    "DELETE /user/installations/{installation_id}/repositories/{repository_id}": Operation<"/user/installations/{installation_id}/repositories/{repository_id}", "delete">;
    /**
     * @see https://docs.github.com/rest/interactions/user#remove-interaction-restrictions-from-your-public-repositories
     */
    "DELETE /user/interaction-limits": Operation<"/user/interaction-limits", "delete">;
    /**
     * @see https://docs.github.com/rest/users/keys#delete-a-public-ssh-key-for-the-authenticated-user
     */
    "DELETE /user/keys/{key_id}": Operation<"/user/keys/{key_id}", "delete">;
    /**
     * @see https://docs.github.com/rest/migrations/users#delete-a-user-migration-archive
     */
    "DELETE /user/migrations/{migration_id}/archive": Operation<"/user/migrations/{migration_id}/archive", "delete">;
    /**
     * @see https://docs.github.com/rest/migrations/users#unlock-a-user-repository
     */
    "DELETE /user/migrations/{migration_id}/repos/{repo_name}/lock": Operation<"/user/migrations/{migration_id}/repos/{repo_name}/lock", "delete">;
    /**
     * @see https://docs.github.com/rest/packages/packages#delete-a-package-for-the-authenticated-user
     */
    "DELETE /user/packages/{package_type}/{package_name}": Operation<"/user/packages/{package_type}/{package_name}", "delete">;
    /**
     * @see https://docs.github.com/rest/packages/packages#delete-a-package-version-for-the-authenticated-user
     */
    "DELETE /user/packages/{package_type}/{package_name}/versions/{package_version_id}": Operation<"/user/packages/{package_type}/{package_name}/versions/{package_version_id}", "delete">;
    /**
     * @see https://docs.github.com/rest/collaborators/invitations#decline-a-repository-invitation
     */
    "DELETE /user/repository_invitations/{invitation_id}": Operation<"/user/repository_invitations/{invitation_id}", "delete">;
    /**
     * @see https://docs.github.com/rest/users/social-accounts#delete-social-accounts-for-the-authenticated-user
     */
    "DELETE /user/social_accounts": Operation<"/user/social_accounts", "delete">;
    /**
     * @see https://docs.github.com/rest/users/ssh-signing-keys#delete-an-ssh-signing-key-for-the-authenticated-user
     */
    "DELETE /user/ssh_signing_keys/{ssh_signing_key_id}": Operation<"/user/ssh_signing_keys/{ssh_signing_key_id}", "delete">;
    /**
     * @see https://docs.github.com/rest/activity/starring#unstar-a-repository-for-the-authenticated-user
     */
    "DELETE /user/starred/{owner}/{repo}": Operation<"/user/starred/{owner}/{repo}", "delete">;
    /**
     * @see https://docs.github.com/rest/packages/packages#delete-a-package-for-a-user
     */
    "DELETE /users/{username}/packages/{package_type}/{package_name}": Operation<"/users/{username}/packages/{package_type}/{package_name}", "delete">;
    /**
     * @see https://docs.github.com/rest/packages/packages#delete-package-version-for-a-user
     */
    "DELETE /users/{username}/packages/{package_type}/{package_name}/versions/{package_version_id}": Operation<"/users/{username}/packages/{package_type}/{package_name}/versions/{package_version_id}", "delete">;
    /**
     * @see https://docs.github.com/rest/meta/meta#github-api-root
     */
    "GET /": Operation<"/", "get">;
    /**
     * @see https://docs.github.com/rest/security-advisories/global-advisories#list-global-security-advisories
     */
    "GET /advisories": Operation<"/advisories", "get">;
    /**
     * @see https://docs.github.com/rest/security-advisories/global-advisories#get-a-global-security-advisory
     */
    "GET /advisories/{ghsa_id}": Operation<"/advisories/{ghsa_id}", "get">;
    /**
     * @see https://docs.github.com/rest/apps/apps#get-the-authenticated-app
     */
    "GET /app": Operation<"/app", "get">;
    /**
     * @see https://docs.github.com/rest/apps/webhooks#get-a-webhook-configuration-for-an-app
     */
    "GET /app/hook/config": Operation<"/app/hook/config", "get">;
    /**
     * @see https://docs.github.com/rest/apps/webhooks#list-deliveries-for-an-app-webhook
     */
    "GET /app/hook/deliveries": Operation<"/app/hook/deliveries", "get">;
    /**
     * @see https://docs.github.com/rest/apps/webhooks#get-a-delivery-for-an-app-webhook
     */
    "GET /app/hook/deliveries/{delivery_id}": Operation<"/app/hook/deliveries/{delivery_id}", "get">;
    /**
     * @see https://docs.github.com/rest/apps/apps#list-installation-requests-for-the-authenticated-app
     */
    "GET /app/installation-requests": Operation<"/app/installation-requests", "get">;
    /**
     * @see https://docs.github.com/enterprise-server@3.9/rest/apps/apps#list-installations-for-the-authenticated-app
     */
    "GET /app/installations": Operation<"/app/installations", "get">;
    /**
     * @see https://docs.github.com/rest/apps/apps#get-an-installation-for-the-authenticated-app
     */
    "GET /app/installations/{installation_id}": Operation<"/app/installations/{installation_id}", "get">;
    /**
     * @see https://docs.github.com/rest/apps/apps#get-an-app
     */
    "GET /apps/{app_slug}": Operation<"/apps/{app_slug}", "get">;
    /**
     * @see https://docs.github.com/rest/classroom/classroom#get-an-assignment
     */
    "GET /assignments/{assignment_id}": Operation<"/assignments/{assignment_id}", "get">;
    /**
     * @see https://docs.github.com/rest/classroom/classroom#list-accepted-assignments-for-an-assignment
     */
    "GET /assignments/{assignment_id}/accepted_assignments": Operation<"/assignments/{assignment_id}/accepted_assignments", "get">;
    /**
     * @see https://docs.github.com/rest/classroom/classroom#get-assignment-grades
     */
    "GET /assignments/{assignment_id}/grades": Operation<"/assignments/{assignment_id}/grades", "get">;
    /**
     * @see https://docs.github.com/rest/classroom/classroom#list-classrooms
     */
    "GET /classrooms": Operation<"/classrooms", "get">;
    /**
     * @see https://docs.github.com/rest/classroom/classroom#get-a-classroom
     */
    "GET /classrooms/{classroom_id}": Operation<"/classrooms/{classroom_id}", "get">;
    /**
     * @see https://docs.github.com/rest/classroom/classroom#list-assignments-for-a-classroom
     */
    "GET /classrooms/{classroom_id}/assignments": Operation<"/classrooms/{classroom_id}/assignments", "get">;
    /**
     * @see https://docs.github.com/rest/codes-of-conduct/codes-of-conduct#get-all-codes-of-conduct
     */
    "GET /codes_of_conduct": Operation<"/codes_of_conduct", "get">;
    /**
     * @see https://docs.github.com/rest/codes-of-conduct/codes-of-conduct#get-a-code-of-conduct
     */
    "GET /codes_of_conduct/{key}": Operation<"/codes_of_conduct/{key}", "get">;
    /**
     * @see https://docs.github.com/rest/emojis/emojis#get-emojis
     */
    "GET /emojis": Operation<"/emojis", "get">;
    /**
     * @see https://docs.github.com/rest/code-security/configurations#get-code-security-configurations-for-an-enterprise
     */
    "GET /enterprises/{enterprise}/code-security/configurations": Operation<"/enterprises/{enterprise}/code-security/configurations", "get">;
    /**
     * @see https://docs.github.com/rest/code-security/configurations#get-default-code-security-configurations-for-an-enterprise
     */
    "GET /enterprises/{enterprise}/code-security/configurations/defaults": Operation<"/enterprises/{enterprise}/code-security/configurations/defaults", "get">;
    /**
     * @see https://docs.github.com/rest/code-security/configurations#retrieve-a-code-security-configuration-of-an-enterprise
     */
    "GET /enterprises/{enterprise}/code-security/configurations/{configuration_id}": Operation<"/enterprises/{enterprise}/code-security/configurations/{configuration_id}", "get">;
    /**
     * @see https://docs.github.com/rest/code-security/configurations#get-repositories-associated-with-an-enterprise-code-security-configuration
     */
    "GET /enterprises/{enterprise}/code-security/configurations/{configuration_id}/repositories": Operation<"/enterprises/{enterprise}/code-security/configurations/{configuration_id}/repositories", "get">;
    /**
     * @see https://docs.github.com/rest/dependabot/alerts#list-dependabot-alerts-for-an-enterprise
     */
    "GET /enterprises/{enterprise}/dependabot/alerts": Operation<"/enterprises/{enterprise}/dependabot/alerts", "get">;
    /**
     * @see https://docs.github.com/rest/secret-scanning/secret-scanning#list-secret-scanning-alerts-for-an-enterprise
     */
    "GET /enterprises/{enterprise}/secret-scanning/alerts": Operation<"/enterprises/{enterprise}/secret-scanning/alerts", "get">;
    /**
     * @see https://docs.github.com/rest/activity/events#list-public-events
     */
    "GET /events": Operation<"/events", "get">;
    /**
     * @see https://docs.github.com/rest/activity/feeds#get-feeds
     */
    "GET /feeds": Operation<"/feeds", "get">;
    /**
     * @see https://docs.github.com/rest/gists/gists#list-gists-for-the-authenticated-user
     */
    "GET /gists": Operation<"/gists", "get">;
    /**
     * @see https://docs.github.com/rest/gists/gists#list-public-gists
     */
    "GET /gists/public": Operation<"/gists/public", "get">;
    /**
     * @see https://docs.github.com/rest/gists/gists#list-starred-gists
     */
    "GET /gists/starred": Operation<"/gists/starred", "get">;
    /**
     * @see https://docs.github.com/rest/gists/gists#get-a-gist
     */
    "GET /gists/{gist_id}": Operation<"/gists/{gist_id}", "get">;
    /**
     * @see https://docs.github.com/rest/gists/comments#list-gist-comments
     */
    "GET /gists/{gist_id}/comments": Operation<"/gists/{gist_id}/comments", "get">;
    /**
     * @see https://docs.github.com/rest/gists/comments#get-a-gist-comment
     */
    "GET /gists/{gist_id}/comments/{comment_id}": Operation<"/gists/{gist_id}/comments/{comment_id}", "get">;
    /**
     * @see https://docs.github.com/rest/gists/gists#list-gist-commits
     */
    "GET /gists/{gist_id}/commits": Operation<"/gists/{gist_id}/commits", "get">;
    /**
     * @see https://docs.github.com/rest/gists/gists#list-gist-forks
     */
    "GET /gists/{gist_id}/forks": Operation<"/gists/{gist_id}/forks", "get">;
    /**
     * @see https://docs.github.com/rest/gists/gists#check-if-a-gist-is-starred
     */
    "GET /gists/{gist_id}/star": Operation<"/gists/{gist_id}/star", "get">;
    /**
     * @see https://docs.github.com/rest/gists/gists#get-a-gist-revision
     */
    "GET /gists/{gist_id}/{sha}": Operation<"/gists/{gist_id}/{sha}", "get">;
    /**
     * @see https://docs.github.com/rest/gitignore/gitignore#get-all-gitignore-templates
     */
    "GET /gitignore/templates": Operation<"/gitignore/templates", "get">;
    /**
     * @see https://docs.github.com/rest/gitignore/gitignore#get-a-gitignore-template
     */
    "GET /gitignore/templates/{name}": Operation<"/gitignore/templates/{name}", "get">;
    /**
     * @see https://docs.github.com/rest/apps/installations#list-repositories-accessible-to-the-app-installation
     */
    "GET /installation/repositories": Operation<"/installation/repositories", "get">;
    /**
     * @see https://docs.github.com/rest/issues/issues#list-issues-assigned-to-the-authenticated-user
     */
    "GET /issues": Operation<"/issues", "get">;
    /**
     * @see https://docs.github.com/rest/licenses/licenses#get-all-commonly-used-licenses
     */
    "GET /licenses": Operation<"/licenses", "get">;
    /**
     * @see https://docs.github.com/rest/licenses/licenses#get-a-license
     */
    "GET /licenses/{license}": Operation<"/licenses/{license}", "get">;
    /**
     * @see https://docs.github.com/rest/apps/marketplace#get-a-subscription-plan-for-an-account
     */
    "GET /marketplace_listing/accounts/{account_id}": Operation<"/marketplace_listing/accounts/{account_id}", "get">;
    /**
     * @see https://docs.github.com/rest/apps/marketplace#list-plans
     */
    "GET /marketplace_listing/plans": Operation<"/marketplace_listing/plans", "get">;
    /**
     * @see https://docs.github.com/rest/apps/marketplace#list-accounts-for-a-plan
     */
    "GET /marketplace_listing/plans/{plan_id}/accounts": Operation<"/marketplace_listing/plans/{plan_id}/accounts", "get">;
    /**
     * @see https://docs.github.com/rest/apps/marketplace#get-a-subscription-plan-for-an-account-stubbed
     */
    "GET /marketplace_listing/stubbed/accounts/{account_id}": Operation<"/marketplace_listing/stubbed/accounts/{account_id}", "get">;
    /**
     * @see https://docs.github.com/rest/apps/marketplace#list-plans-stubbed
     */
    "GET /marketplace_listing/stubbed/plans": Operation<"/marketplace_listing/stubbed/plans", "get">;
    /**
     * @see https://docs.github.com/rest/apps/marketplace#list-accounts-for-a-plan-stubbed
     */
    "GET /marketplace_listing/stubbed/plans/{plan_id}/accounts": Operation<"/marketplace_listing/stubbed/plans/{plan_id}/accounts", "get">;
    /**
     * @see https://docs.github.com/rest/meta/meta#get-apiname-meta-information
     */
    "GET /meta": Operation<"/meta", "get">;
    /**
     * @see https://docs.github.com/rest/activity/events#list-public-events-for-a-network-of-repositories
     */
    "GET /networks/{owner}/{repo}/events": Operation<"/networks/{owner}/{repo}/events", "get">;
    /**
     * @see https://docs.github.com/rest/activity/notifications#list-notifications-for-the-authenticated-user
     */
    "GET /notifications": Operation<"/notifications", "get">;
    /**
     * @see https://docs.github.com/rest/activity/notifications#get-a-thread
     */
    "GET /notifications/threads/{thread_id}": Operation<"/notifications/threads/{thread_id}", "get">;
    /**
     * @see https://docs.github.com/rest/activity/notifications#get-a-thread-subscription-for-the-authenticated-user
     */
    "GET /notifications/threads/{thread_id}/subscription": Operation<"/notifications/threads/{thread_id}/subscription", "get">;
    /**
     * @see https://docs.github.com/rest/meta/meta#get-octocat
     */
    "GET /octocat": Operation<"/octocat", "get">;
    /**
     * @see https://docs.github.com/rest/orgs/orgs#list-organizations
     */
    "GET /organizations": Operation<"/organizations", "get">;
    /**
     * @see https://docs.github.com/rest/billing/enhanced-billing#get-billing-usage-report-for-an-organization
     */
    "GET /organizations/{org}/settings/billing/usage": Operation<"/organizations/{org}/settings/billing/usage", "get">;
    /**
     * @see https://docs.github.com/rest/codespaces/organizations#list-codespaces-for-the-organization
     * @deprecated "org_id" is now "org"
     */
    "GET /orgs/{org_id}/codespaces": Operation<"/orgs/{org}/codespaces", "get">;
    /**
     * @see https://docs.github.com/rest/orgs/orgs#get-an-organization
     */
    "GET /orgs/{org}": Operation<"/orgs/{org}", "get">;
    /**
     * @see https://docs.github.com/rest/actions/cache#get-github-actions-cache-usage-for-an-organization
     */
    "GET /orgs/{org}/actions/cache/usage": Operation<"/orgs/{org}/actions/cache/usage", "get">;
    /**
     * @see https://docs.github.com/rest/actions/cache#list-repositories-with-github-actions-cache-usage-for-an-organization
     */
    "GET /orgs/{org}/actions/cache/usage-by-repository": Operation<"/orgs/{org}/actions/cache/usage-by-repository", "get">;
    /**
     * @see https://docs.github.com/rest/actions/hosted-runners#list-github-hosted-runners-for-an-organization
     */
    "GET /orgs/{org}/actions/hosted-runners": Operation<"/orgs/{org}/actions/hosted-runners", "get">;
    /**
     * @see https://docs.github.com/rest/actions/hosted-runners#get-github-owned-images-for-github-hosted-runners-in-an-organization
     */
    "GET /orgs/{org}/actions/hosted-runners/images/github-owned": Operation<"/orgs/{org}/actions/hosted-runners/images/github-owned", "get">;
    /**
     * @see https://docs.github.com/rest/actions/hosted-runners#get-partner-images-for-github-hosted-runners-in-an-organization
     */
    "GET /orgs/{org}/actions/hosted-runners/images/partner": Operation<"/orgs/{org}/actions/hosted-runners/images/partner", "get">;
    /**
     * @see https://docs.github.com/rest/actions/hosted-runners#get-limits-on-github-hosted-runners-for-an-organization
     */
    "GET /orgs/{org}/actions/hosted-runners/limits": Operation<"/orgs/{org}/actions/hosted-runners/limits", "get">;
    /**
     * @see https://docs.github.com/rest/actions/hosted-runners#get-github-hosted-runners-machine-specs-for-an-organization
     */
    "GET /orgs/{org}/actions/hosted-runners/machine-sizes": Operation<"/orgs/{org}/actions/hosted-runners/machine-sizes", "get">;
    /**
     * @see https://docs.github.com/rest/actions/hosted-runners#get-platforms-for-github-hosted-runners-in-an-organization
     */
    "GET /orgs/{org}/actions/hosted-runners/platforms": Operation<"/orgs/{org}/actions/hosted-runners/platforms", "get">;
    /**
     * @see https://docs.github.com/rest/actions/hosted-runners#get-a-github-hosted-runner-for-an-organization
     */
    "GET /orgs/{org}/actions/hosted-runners/{hosted_runner_id}": Operation<"/orgs/{org}/actions/hosted-runners/{hosted_runner_id}", "get">;
    /**
     * @see https://docs.github.com/rest/actions/oidc#get-the-customization-template-for-an-oidc-subject-claim-for-an-organization
     */
    "GET /orgs/{org}/actions/oidc/customization/sub": Operation<"/orgs/{org}/actions/oidc/customization/sub", "get">;
    /**
     * @see https://docs.github.com/rest/actions/permissions#get-github-actions-permissions-for-an-organization
     */
    "GET /orgs/{org}/actions/permissions": Operation<"/orgs/{org}/actions/permissions", "get">;
    /**
     * @see https://docs.github.com/rest/actions/permissions#list-selected-repositories-enabled-for-github-actions-in-an-organization
     */
    "GET /orgs/{org}/actions/permissions/repositories": Operation<"/orgs/{org}/actions/permissions/repositories", "get">;
    /**
     * @see https://docs.github.com/rest/actions/permissions#get-allowed-actions-and-reusable-workflows-for-an-organization
     */
    "GET /orgs/{org}/actions/permissions/selected-actions": Operation<"/orgs/{org}/actions/permissions/selected-actions", "get">;
    /**
     * @see https://docs.github.com/rest/actions/permissions#get-default-workflow-permissions-for-an-organization
     */
    "GET /orgs/{org}/actions/permissions/workflow": Operation<"/orgs/{org}/actions/permissions/workflow", "get">;
    /**
     * @see https://docs.github.com/rest/actions/self-hosted-runner-groups#list-self-hosted-runner-groups-for-an-organization
     */
    "GET /orgs/{org}/actions/runner-groups": Operation<"/orgs/{org}/actions/runner-groups", "get">;
    /**
     * @see https://docs.github.com/rest/actions/self-hosted-runner-groups#get-a-self-hosted-runner-group-for-an-organization
     */
    "GET /orgs/{org}/actions/runner-groups/{runner_group_id}": Operation<"/orgs/{org}/actions/runner-groups/{runner_group_id}", "get">;
    /**
     * @see https://docs.github.com/rest/actions/self-hosted-runner-groups#list-github-hosted-runners-in-a-group-for-an-organization
     */
    "GET /orgs/{org}/actions/runner-groups/{runner_group_id}/hosted-runners": Operation<"/orgs/{org}/actions/runner-groups/{runner_group_id}/hosted-runners", "get">;
    /**
     * @see https://docs.github.com/rest/actions/self-hosted-runner-groups#list-repository-access-to-a-self-hosted-runner-group-in-an-organization
     */
    "GET /orgs/{org}/actions/runner-groups/{runner_group_id}/repositories": Operation<"/orgs/{org}/actions/runner-groups/{runner_group_id}/repositories", "get">;
    /**
     * @see https://docs.github.com/rest/actions/self-hosted-runner-groups#list-self-hosted-runners-in-a-group-for-an-organization
     */
    "GET /orgs/{org}/actions/runner-groups/{runner_group_id}/runners": Operation<"/orgs/{org}/actions/runner-groups/{runner_group_id}/runners", "get">;
    /**
     * @see https://docs.github.com/rest/actions/self-hosted-runners#list-self-hosted-runners-for-an-organization
     */
    "GET /orgs/{org}/actions/runners": Operation<"/orgs/{org}/actions/runners", "get">;
    /**
     * @see https://docs.github.com/rest/actions/self-hosted-runners#list-runner-applications-for-an-organization
     */
    "GET /orgs/{org}/actions/runners/downloads": Operation<"/orgs/{org}/actions/runners/downloads", "get">;
    /**
     * @see https://docs.github.com/rest/actions/self-hosted-runners#get-a-self-hosted-runner-for-an-organization
     */
    "GET /orgs/{org}/actions/runners/{runner_id}": Operation<"/orgs/{org}/actions/runners/{runner_id}", "get">;
    /**
     * @see https://docs.github.com/rest/actions/self-hosted-runners#list-labels-for-a-self-hosted-runner-for-an-organization
     */
    "GET /orgs/{org}/actions/runners/{runner_id}/labels": Operation<"/orgs/{org}/actions/runners/{runner_id}/labels", "get">;
    /**
     * @see https://docs.github.com/rest/actions/secrets#list-organization-secrets
     */
    "GET /orgs/{org}/actions/secrets": Operation<"/orgs/{org}/actions/secrets", "get">;
    /**
     * @see https://docs.github.com/rest/actions/secrets#get-an-organization-public-key
     */
    "GET /orgs/{org}/actions/secrets/public-key": Operation<"/orgs/{org}/actions/secrets/public-key", "get">;
    /**
     * @see https://docs.github.com/rest/actions/secrets#get-an-organization-secret
     */
    "GET /orgs/{org}/actions/secrets/{secret_name}": Operation<"/orgs/{org}/actions/secrets/{secret_name}", "get">;
    /**
     * @see https://docs.github.com/rest/actions/secrets#list-selected-repositories-for-an-organization-secret
     */
    "GET /orgs/{org}/actions/secrets/{secret_name}/repositories": Operation<"/orgs/{org}/actions/secrets/{secret_name}/repositories", "get">;
    /**
     * @see https://docs.github.com/rest/actions/variables#list-organization-variables
     */
    "GET /orgs/{org}/actions/variables": Operation<"/orgs/{org}/actions/variables", "get">;
    /**
     * @see https://docs.github.com/rest/actions/variables#get-an-organization-variable
     */
    "GET /orgs/{org}/actions/variables/{name}": Operation<"/orgs/{org}/actions/variables/{name}", "get">;
    /**
     * @see https://docs.github.com/rest/actions/variables#list-selected-repositories-for-an-organization-variable
     */
    "GET /orgs/{org}/actions/variables/{name}/repositories": Operation<"/orgs/{org}/actions/variables/{name}/repositories", "get">;
    /**
     * @see https://docs.github.com/rest/orgs/orgs#list-attestations
     */
    "GET /orgs/{org}/attestations/{subject_digest}": Operation<"/orgs/{org}/attestations/{subject_digest}", "get">;
    /**
     * @see https://docs.github.com/rest/orgs/blocking#list-users-blocked-by-an-organization
     */
    "GET /orgs/{org}/blocks": Operation<"/orgs/{org}/blocks", "get">;
    /**
     * @see https://docs.github.com/rest/orgs/blocking#check-if-a-user-is-blocked-by-an-organization
     */
    "GET /orgs/{org}/blocks/{username}": Operation<"/orgs/{org}/blocks/{username}", "get">;
    /**
     * @see https://docs.github.com/rest/code-scanning/code-scanning#list-code-scanning-alerts-for-an-organization
     */
    "GET /orgs/{org}/code-scanning/alerts": Operation<"/orgs/{org}/code-scanning/alerts", "get">;
    /**
     * @see https://docs.github.com/rest/code-security/configurations#get-code-security-configurations-for-an-organization
     */
    "GET /orgs/{org}/code-security/configurations": Operation<"/orgs/{org}/code-security/configurations", "get">;
    /**
     * @see https://docs.github.com/rest/code-security/configurations#get-default-code-security-configurations
     */
    "GET /orgs/{org}/code-security/configurations/defaults": Operation<"/orgs/{org}/code-security/configurations/defaults", "get">;
    /**
     * @see https://docs.github.com/rest/code-security/configurations#get-a-code-security-configuration
     */
    "GET /orgs/{org}/code-security/configurations/{configuration_id}": Operation<"/orgs/{org}/code-security/configurations/{configuration_id}", "get">;
    /**
     * @see https://docs.github.com/rest/code-security/configurations#get-repositories-associated-with-a-code-security-configuration
     */
    "GET /orgs/{org}/code-security/configurations/{configuration_id}/repositories": Operation<"/orgs/{org}/code-security/configurations/{configuration_id}/repositories", "get">;
    /**
     * @see https://docs.github.com/rest/codespaces/organizations#list-codespaces-for-the-organization
     */
    "GET /orgs/{org}/codespaces": Operation<"/orgs/{org}/codespaces", "get">;
    /**
     * @see https://docs.github.com/rest/codespaces/organization-secrets#list-organization-secrets
     */
    "GET /orgs/{org}/codespaces/secrets": Operation<"/orgs/{org}/codespaces/secrets", "get">;
    /**
     * @see https://docs.github.com/rest/codespaces/organization-secrets#get-an-organization-public-key
     */
    "GET /orgs/{org}/codespaces/secrets/public-key": Operation<"/orgs/{org}/codespaces/secrets/public-key", "get">;
    /**
     * @see https://docs.github.com/rest/codespaces/organization-secrets#get-an-organization-secret
     */
    "GET /orgs/{org}/codespaces/secrets/{secret_name}": Operation<"/orgs/{org}/codespaces/secrets/{secret_name}", "get">;
    /**
     * @see https://docs.github.com/rest/codespaces/organization-secrets#list-selected-repositories-for-an-organization-secret
     */
    "GET /orgs/{org}/codespaces/secrets/{secret_name}/repositories": Operation<"/orgs/{org}/codespaces/secrets/{secret_name}/repositories", "get">;
    /**
     * @see https://docs.github.com/rest/copilot/copilot-user-management#get-copilot-seat-information-and-settings-for-an-organization
     */
    "GET /orgs/{org}/copilot/billing": Operation<"/orgs/{org}/copilot/billing", "get">;
    /**
     * @see https://docs.github.com/rest/copilot/copilot-user-management#list-all-copilot-seat-assignments-for-an-organization
     */
    "GET /orgs/{org}/copilot/billing/seats": Operation<"/orgs/{org}/copilot/billing/seats", "get">;
    /**
     * @see https://docs.github.com/rest/copilot/copilot-metrics#get-copilot-metrics-for-an-organization
     */
    "GET /orgs/{org}/copilot/metrics": Operation<"/orgs/{org}/copilot/metrics", "get">;
    /**
     * @see https://docs.github.com/rest/copilot/copilot-usage#get-a-summary-of-copilot-usage-for-organization-members
     */
    "GET /orgs/{org}/copilot/usage": Operation<"/orgs/{org}/copilot/usage", "get">;
    /**
     * @see https://docs.github.com/rest/dependabot/alerts#list-dependabot-alerts-for-an-organization
     */
    "GET /orgs/{org}/dependabot/alerts": Operation<"/orgs/{org}/dependabot/alerts", "get">;
    /**
     * @see https://docs.github.com/rest/dependabot/secrets#list-organization-secrets
     */
    "GET /orgs/{org}/dependabot/secrets": Operation<"/orgs/{org}/dependabot/secrets", "get">;
    /**
     * @see https://docs.github.com/rest/dependabot/secrets#get-an-organization-public-key
     */
    "GET /orgs/{org}/dependabot/secrets/public-key": Operation<"/orgs/{org}/dependabot/secrets/public-key", "get">;
    /**
     * @see https://docs.github.com/rest/dependabot/secrets#get-an-organization-secret
     */
    "GET /orgs/{org}/dependabot/secrets/{secret_name}": Operation<"/orgs/{org}/dependabot/secrets/{secret_name}", "get">;
    /**
     * @see https://docs.github.com/rest/dependabot/secrets#list-selected-repositories-for-an-organization-secret
     */
    "GET /orgs/{org}/dependabot/secrets/{secret_name}/repositories": Operation<"/orgs/{org}/dependabot/secrets/{secret_name}/repositories", "get">;
    /**
     * @see https://docs.github.com/rest/packages/packages#get-list-of-conflicting-packages-during-docker-migration-for-organization
     */
    "GET /orgs/{org}/docker/conflicts": Operation<"/orgs/{org}/docker/conflicts", "get">;
    /**
     * @see https://docs.github.com/rest/activity/events#list-public-organization-events
     */
    "GET /orgs/{org}/events": Operation<"/orgs/{org}/events", "get">;
    /**
     * @see https://docs.github.com/rest/orgs/members#list-failed-organization-invitations
     */
    "GET /orgs/{org}/failed_invitations": Operation<"/orgs/{org}/failed_invitations", "get">;
    /**
     * @see https://docs.github.com/rest/orgs/webhooks#list-organization-webhooks
     */
    "GET /orgs/{org}/hooks": Operation<"/orgs/{org}/hooks", "get">;
    /**
     * @see https://docs.github.com/rest/orgs/webhooks#get-an-organization-webhook
     */
    "GET /orgs/{org}/hooks/{hook_id}": Operation<"/orgs/{org}/hooks/{hook_id}", "get">;
    /**
     * @see https://docs.github.com/rest/orgs/webhooks#get-a-webhook-configuration-for-an-organization
     */
    "GET /orgs/{org}/hooks/{hook_id}/config": Operation<"/orgs/{org}/hooks/{hook_id}/config", "get">;
    /**
     * @see https://docs.github.com/rest/orgs/webhooks#list-deliveries-for-an-organization-webhook
     */
    "GET /orgs/{org}/hooks/{hook_id}/deliveries": Operation<"/orgs/{org}/hooks/{hook_id}/deliveries", "get">;
    /**
     * @see https://docs.github.com/rest/orgs/webhooks#get-a-webhook-delivery-for-an-organization-webhook
     */
    "GET /orgs/{org}/hooks/{hook_id}/deliveries/{delivery_id}": Operation<"/orgs/{org}/hooks/{hook_id}/deliveries/{delivery_id}", "get">;
    /**
     * @see https://docs.github.com/rest/orgs/api-insights#get-route-stats-by-actor
     */
    "GET /orgs/{org}/insights/api/route-stats/{actor_type}/{actor_id}": Operation<"/orgs/{org}/insights/api/route-stats/{actor_type}/{actor_id}", "get">;
    /**
     * @see https://docs.github.com/rest/orgs/api-insights#get-subject-stats
     */
    "GET /orgs/{org}/insights/api/subject-stats": Operation<"/orgs/{org}/insights/api/subject-stats", "get">;
    /**
     * @see https://docs.github.com/rest/orgs/api-insights#get-summary-stats
     */
    "GET /orgs/{org}/insights/api/summary-stats": Operation<"/orgs/{org}/insights/api/summary-stats", "get">;
    /**
     * @see https://docs.github.com/rest/orgs/api-insights#get-summary-stats-by-user
     */
    "GET /orgs/{org}/insights/api/summary-stats/users/{user_id}": Operation<"/orgs/{org}/insights/api/summary-stats/users/{user_id}", "get">;
    /**
     * @see https://docs.github.com/rest/orgs/api-insights#get-summary-stats-by-actor
     */
    "GET /orgs/{org}/insights/api/summary-stats/{actor_type}/{actor_id}": Operation<"/orgs/{org}/insights/api/summary-stats/{actor_type}/{actor_id}", "get">;
    /**
     * @see https://docs.github.com/rest/orgs/api-insights#get-time-stats
     */
    "GET /orgs/{org}/insights/api/time-stats": Operation<"/orgs/{org}/insights/api/time-stats", "get">;
    /**
     * @see https://docs.github.com/rest/orgs/api-insights#get-time-stats-by-user
     */
    "GET /orgs/{org}/insights/api/time-stats/users/{user_id}": Operation<"/orgs/{org}/insights/api/time-stats/users/{user_id}", "get">;
    /**
     * @see https://docs.github.com/rest/orgs/api-insights#get-time-stats-by-actor
     */
    "GET /orgs/{org}/insights/api/time-stats/{actor_type}/{actor_id}": Operation<"/orgs/{org}/insights/api/time-stats/{actor_type}/{actor_id}", "get">;
    /**
     * @see https://docs.github.com/rest/orgs/api-insights#get-user-stats
     */
    "GET /orgs/{org}/insights/api/user-stats/{user_id}": Operation<"/orgs/{org}/insights/api/user-stats/{user_id}", "get">;
    /**
     * @see https://docs.github.com/rest/apps/apps#get-an-organization-installation-for-the-authenticated-app
     */
    "GET /orgs/{org}/installation": Operation<"/orgs/{org}/installation", "get">;
    /**
     * @see https://docs.github.com/rest/orgs/orgs#list-app-installations-for-an-organization
     */
    "GET /orgs/{org}/installations": Operation<"/orgs/{org}/installations", "get">;
    /**
     * @see https://docs.github.com/rest/interactions/orgs#get-interaction-restrictions-for-an-organization
     */
    "GET /orgs/{org}/interaction-limits": Operation<"/orgs/{org}/interaction-limits", "get">;
    /**
     * @see https://docs.github.com/rest/orgs/members#list-pending-organization-invitations
     */
    "GET /orgs/{org}/invitations": Operation<"/orgs/{org}/invitations", "get">;
    /**
     * @see https://docs.github.com/rest/orgs/members#list-organization-invitation-teams
     */
    "GET /orgs/{org}/invitations/{invitation_id}/teams": Operation<"/orgs/{org}/invitations/{invitation_id}/teams", "get">;
    /**
     * @see https://docs.github.com/rest/orgs/issue-types#list-issue-types-for-an-organization
     */
    "GET /orgs/{org}/issue-types": Operation<"/orgs/{org}/issue-types", "get">;
    /**
     * @see https://docs.github.com/rest/issues/issues#list-organization-issues-assigned-to-the-authenticated-user
     */
    "GET /orgs/{org}/issues": Operation<"/orgs/{org}/issues", "get">;
    /**
     * @see https://docs.github.com/rest/orgs/members#list-organization-members
     */
    "GET /orgs/{org}/members": Operation<"/orgs/{org}/members", "get">;
    /**
     * @see https://docs.github.com/rest/orgs/members#check-organization-membership-for-a-user
     */
    "GET /orgs/{org}/members/{username}": Operation<"/orgs/{org}/members/{username}", "get">;
    /**
     * @see https://docs.github.com/rest/codespaces/organizations#list-codespaces-for-a-user-in-organization
     */
    "GET /orgs/{org}/members/{username}/codespaces": Operation<"/orgs/{org}/members/{username}/codespaces", "get">;
    /**
     * @see https://docs.github.com/rest/copilot/copilot-user-management#get-copilot-seat-assignment-details-for-a-user
     */
    "GET /orgs/{org}/members/{username}/copilot": Operation<"/orgs/{org}/members/{username}/copilot", "get">;
    /**
     * @see https://docs.github.com/rest/orgs/members#get-organization-membership-for-a-user
     */
    "GET /orgs/{org}/memberships/{username}": Operation<"/orgs/{org}/memberships/{username}", "get">;
    /**
     * @see https://docs.github.com/rest/migrations/orgs#list-organization-migrations
     */
    "GET /orgs/{org}/migrations": Operation<"/orgs/{org}/migrations", "get">;
    /**
     * @see https://docs.github.com/rest/migrations/orgs#get-an-organization-migration-status
     */
    "GET /orgs/{org}/migrations/{migration_id}": Operation<"/orgs/{org}/migrations/{migration_id}", "get">;
    /**
     * @see https://docs.github.com/rest/migrations/orgs#download-an-organization-migration-archive
     */
    "GET /orgs/{org}/migrations/{migration_id}/archive": Operation<"/orgs/{org}/migrations/{migration_id}/archive", "get">;
    /**
     * @see https://docs.github.com/rest/migrations/orgs#list-repositories-in-an-organization-migration
     */
    "GET /orgs/{org}/migrations/{migration_id}/repositories": Operation<"/orgs/{org}/migrations/{migration_id}/repositories", "get">;
    /**
     * @see https://docs.github.com/rest/orgs/organization-roles#list-organization-fine-grained-permissions-for-an-organization
     */
    "GET /orgs/{org}/organization-fine-grained-permissions": Operation<"/orgs/{org}/organization-fine-grained-permissions", "get">;
    /**
     * @see https://docs.github.com/rest/orgs/organization-roles#get-all-organization-roles-for-an-organization
     */
    "GET /orgs/{org}/organization-roles": Operation<"/orgs/{org}/organization-roles", "get">;
    /**
     * @see https://docs.github.com/rest/orgs/organization-roles#get-an-organization-role
     */
    "GET /orgs/{org}/organization-roles/{role_id}": Operation<"/orgs/{org}/organization-roles/{role_id}", "get">;
    /**
     * @see https://docs.github.com/rest/orgs/organization-roles#list-teams-that-are-assigned-to-an-organization-role
     */
    "GET /orgs/{org}/organization-roles/{role_id}/teams": Operation<"/orgs/{org}/organization-roles/{role_id}/teams", "get">;
    /**
     * @see https://docs.github.com/rest/orgs/organization-roles#list-users-that-are-assigned-to-an-organization-role
     */
    "GET /orgs/{org}/organization-roles/{role_id}/users": Operation<"/orgs/{org}/organization-roles/{role_id}/users", "get">;
    /**
     * @see https://docs.github.com/rest/orgs/outside-collaborators#list-outside-collaborators-for-an-organization
     */
    "GET /orgs/{org}/outside_collaborators": Operation<"/orgs/{org}/outside_collaborators", "get">;
    /**
     * @see https://docs.github.com/rest/packages/packages#list-packages-for-an-organization
     */
    "GET /orgs/{org}/packages": Operation<"/orgs/{org}/packages", "get">;
    /**
     * @see https://docs.github.com/rest/packages/packages#get-a-package-for-an-organization
     */
    "GET /orgs/{org}/packages/{package_type}/{package_name}": Operation<"/orgs/{org}/packages/{package_type}/{package_name}", "get">;
    /**
     * @see https://docs.github.com/rest/packages/packages#list-package-versions-for-a-package-owned-by-an-organization
     */
    "GET /orgs/{org}/packages/{package_type}/{package_name}/versions": Operation<"/orgs/{org}/packages/{package_type}/{package_name}/versions", "get">;
    /**
     * @see https://docs.github.com/rest/packages/packages#get-a-package-version-for-an-organization
     */
    "GET /orgs/{org}/packages/{package_type}/{package_name}/versions/{package_version_id}": Operation<"/orgs/{org}/packages/{package_type}/{package_name}/versions/{package_version_id}", "get">;
    /**
     * @see https://docs.github.com/rest/orgs/personal-access-tokens#list-requests-to-access-organization-resources-with-fine-grained-personal-access-tokens
     */
    "GET /orgs/{org}/personal-access-token-requests": Operation<"/orgs/{org}/personal-access-token-requests", "get">;
    /**
     * @see https://docs.github.com/rest/orgs/personal-access-tokens#list-repositories-requested-to-be-accessed-by-a-fine-grained-personal-access-token
     */
    "GET /orgs/{org}/personal-access-token-requests/{pat_request_id}/repositories": Operation<"/orgs/{org}/personal-access-token-requests/{pat_request_id}/repositories", "get">;
    /**
     * @see https://docs.github.com/rest/orgs/personal-access-tokens#list-fine-grained-personal-access-tokens-with-access-to-organization-resources
     */
    "GET /orgs/{org}/personal-access-tokens": Operation<"/orgs/{org}/personal-access-tokens", "get">;
    /**
     * @see https://docs.github.com/rest/orgs/personal-access-tokens#list-repositories-a-fine-grained-personal-access-token-has-access-to
     */
    "GET /orgs/{org}/personal-access-tokens/{pat_id}/repositories": Operation<"/orgs/{org}/personal-access-tokens/{pat_id}/repositories", "get">;
    /**
     * @see https://docs.github.com/rest/private-registries/organization-configurations#list-private-registries-for-an-organization
     */
    "GET /orgs/{org}/private-registries": Operation<"/orgs/{org}/private-registries", "get">;
    /**
     * @see https://docs.github.com/rest/private-registries/organization-configurations#get-private-registries-public-key-for-an-organization
     */
    "GET /orgs/{org}/private-registries/public-key": Operation<"/orgs/{org}/private-registries/public-key", "get">;
    /**
     * @see https://docs.github.com/rest/private-registries/organization-configurations#get-a-private-registry-for-an-organization
     */
    "GET /orgs/{org}/private-registries/{secret_name}": Operation<"/orgs/{org}/private-registries/{secret_name}", "get">;
    /**
     * @see https://docs.github.com/rest/projects/projects#list-organization-projects
     */
    "GET /orgs/{org}/projects": Operation<"/orgs/{org}/projects", "get">;
    /**
     * @see https://docs.github.com/rest/orgs/custom-properties#get-all-custom-properties-for-an-organization
     */
    "GET /orgs/{org}/properties/schema": Operation<"/orgs/{org}/properties/schema", "get">;
    /**
     * @see https://docs.github.com/rest/orgs/custom-properties#get-a-custom-property-for-an-organization
     */
    "GET /orgs/{org}/properties/schema/{custom_property_name}": Operation<"/orgs/{org}/properties/schema/{custom_property_name}", "get">;
    /**
     * @see https://docs.github.com/rest/orgs/custom-properties#list-custom-property-values-for-organization-repositories
     */
    "GET /orgs/{org}/properties/values": Operation<"/orgs/{org}/properties/values", "get">;
    /**
     * @see https://docs.github.com/rest/orgs/members#list-public-organization-members
     */
    "GET /orgs/{org}/public_members": Operation<"/orgs/{org}/public_members", "get">;
    /**
     * @see https://docs.github.com/rest/orgs/members#check-public-organization-membership-for-a-user
     */
    "GET /orgs/{org}/public_members/{username}": Operation<"/orgs/{org}/public_members/{username}", "get">;
    /**
     * @see https://docs.github.com/rest/repos/repos#list-organization-repositories
     */
    "GET /orgs/{org}/repos": Operation<"/orgs/{org}/repos", "get">;
    /**
     * @see https://docs.github.com/rest/orgs/rules#get-all-organization-repository-rulesets
     */
    "GET /orgs/{org}/rulesets": Operation<"/orgs/{org}/rulesets", "get">;
    /**
     * @see https://docs.github.com/rest/orgs/rule-suites#list-organization-rule-suites
     */
    "GET /orgs/{org}/rulesets/rule-suites": Operation<"/orgs/{org}/rulesets/rule-suites", "get">;
    /**
     * @see https://docs.github.com/rest/orgs/rule-suites#get-an-organization-rule-suite
     */
    "GET /orgs/{org}/rulesets/rule-suites/{rule_suite_id}": Operation<"/orgs/{org}/rulesets/rule-suites/{rule_suite_id}", "get">;
    /**
     * @see https://docs.github.com/rest/orgs/rules#get-an-organization-repository-ruleset
     */
    "GET /orgs/{org}/rulesets/{ruleset_id}": Operation<"/orgs/{org}/rulesets/{ruleset_id}", "get">;
    /**
     * @see https://docs.github.com/rest/orgs/rules#get-organization-ruleset-history
     */
    "GET /orgs/{org}/rulesets/{ruleset_id}/history": Operation<"/orgs/{org}/rulesets/{ruleset_id}/history", "get">;
    /**
     * @see https://docs.github.com/rest/orgs/rules#get-organization-ruleset-version
     */
    "GET /orgs/{org}/rulesets/{ruleset_id}/history/{version_id}": Operation<"/orgs/{org}/rulesets/{ruleset_id}/history/{version_id}", "get">;
    /**
     * @see https://docs.github.com/rest/secret-scanning/secret-scanning#list-secret-scanning-alerts-for-an-organization
     */
    "GET /orgs/{org}/secret-scanning/alerts": Operation<"/orgs/{org}/secret-scanning/alerts", "get">;
    /**
     * @see https://docs.github.com/rest/security-advisories/repository-advisories#list-repository-security-advisories-for-an-organization
     */
    "GET /orgs/{org}/security-advisories": Operation<"/orgs/{org}/security-advisories", "get">;
    /**
     * @see https://docs.github.com/rest/orgs/security-managers#list-security-manager-teams
     */
    "GET /orgs/{org}/security-managers": Operation<"/orgs/{org}/security-managers", "get">;
    /**
     * @see https://docs.github.com/rest/billing/billing#get-github-actions-billing-for-an-organization
     */
    "GET /orgs/{org}/settings/billing/actions": Operation<"/orgs/{org}/settings/billing/actions", "get">;
    /**
     * @see https://docs.github.com/rest/billing/billing#get-github-packages-billing-for-an-organization
     */
    "GET /orgs/{org}/settings/billing/packages": Operation<"/orgs/{org}/settings/billing/packages", "get">;
    /**
     * @see https://docs.github.com/rest/billing/billing#get-shared-storage-billing-for-an-organization
     */
    "GET /orgs/{org}/settings/billing/shared-storage": Operation<"/orgs/{org}/settings/billing/shared-storage", "get">;
    /**
     * @see https://docs.github.com/rest/orgs/network-configurations#list-hosted-compute-network-configurations-for-an-organization
     */
    "GET /orgs/{org}/settings/network-configurations": Operation<"/orgs/{org}/settings/network-configurations", "get">;
    /**
     * @see https://docs.github.com/rest/orgs/network-configurations#get-a-hosted-compute-network-configuration-for-an-organization
     */
    "GET /orgs/{org}/settings/network-configurations/{network_configuration_id}": Operation<"/orgs/{org}/settings/network-configurations/{network_configuration_id}", "get">;
    /**
     * @see https://docs.github.com/rest/orgs/network-configurations#get-a-hosted-compute-network-settings-resource-for-an-organization
     */
    "GET /orgs/{org}/settings/network-settings/{network_settings_id}": Operation<"/orgs/{org}/settings/network-settings/{network_settings_id}", "get">;
    /**
     * @see https://docs.github.com/rest/copilot/copilot-metrics#get-copilot-metrics-for-a-team
     */
    "GET /orgs/{org}/team/{team_slug}/copilot/metrics": Operation<"/orgs/{org}/team/{team_slug}/copilot/metrics", "get">;
    /**
     * @see https://docs.github.com/rest/copilot/copilot-usage#get-a-summary-of-copilot-usage-for-a-team
     */
    "GET /orgs/{org}/team/{team_slug}/copilot/usage": Operation<"/orgs/{org}/team/{team_slug}/copilot/usage", "get">;
    /**
     * @see https://docs.github.com/rest/teams/teams#list-teams
     */
    "GET /orgs/{org}/teams": Operation<"/orgs/{org}/teams", "get">;
    /**
     * @see https://docs.github.com/rest/teams/teams#get-a-team-by-name
     */
    "GET /orgs/{org}/teams/{team_slug}": Operation<"/orgs/{org}/teams/{team_slug}", "get">;
    /**
     * @see https://docs.github.com/rest/teams/discussions#list-discussions
     */
    "GET /orgs/{org}/teams/{team_slug}/discussions": Operation<"/orgs/{org}/teams/{team_slug}/discussions", "get">;
    /**
     * @see https://docs.github.com/rest/teams/discussions#get-a-discussion
     */
    "GET /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}": Operation<"/orgs/{org}/teams/{team_slug}/discussions/{discussion_number}", "get">;
    /**
     * @see https://docs.github.com/rest/teams/discussion-comments#list-discussion-comments
     */
    "GET /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments": Operation<"/orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments", "get">;
    /**
     * @see https://docs.github.com/rest/teams/discussion-comments#get-a-discussion-comment
     */
    "GET /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments/{comment_number}": Operation<"/orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments/{comment_number}", "get">;
    /**
     * @see https://docs.github.com/rest/reactions/reactions#list-reactions-for-a-team-discussion-comment
     */
    "GET /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments/{comment_number}/reactions": Operation<"/orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments/{comment_number}/reactions", "get">;
    /**
     * @see https://docs.github.com/rest/reactions/reactions#list-reactions-for-a-team-discussion
     */
    "GET /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/reactions": Operation<"/orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/reactions", "get">;
    /**
     * @see https://docs.github.com/rest/teams/members#list-pending-team-invitations
     */
    "GET /orgs/{org}/teams/{team_slug}/invitations": Operation<"/orgs/{org}/teams/{team_slug}/invitations", "get">;
    /**
     * @see https://docs.github.com/rest/teams/members#list-team-members
     */
    "GET /orgs/{org}/teams/{team_slug}/members": Operation<"/orgs/{org}/teams/{team_slug}/members", "get">;
    /**
     * @see https://docs.github.com/rest/teams/members#get-team-membership-for-a-user
     */
    "GET /orgs/{org}/teams/{team_slug}/memberships/{username}": Operation<"/orgs/{org}/teams/{team_slug}/memberships/{username}", "get">;
    /**
     * @see https://docs.github.com/rest/teams/teams#list-team-projects
     */
    "GET /orgs/{org}/teams/{team_slug}/projects": Operation<"/orgs/{org}/teams/{team_slug}/projects", "get">;
    /**
     * @see https://docs.github.com/rest/teams/teams#check-team-permissions-for-a-project
     */
    "GET /orgs/{org}/teams/{team_slug}/projects/{project_id}": Operation<"/orgs/{org}/teams/{team_slug}/projects/{project_id}", "get">;
    /**
     * @see https://docs.github.com/rest/teams/teams#list-team-repositories
     */
    "GET /orgs/{org}/teams/{team_slug}/repos": Operation<"/orgs/{org}/teams/{team_slug}/repos", "get">;
    /**
     * @see https://docs.github.com/rest/teams/teams#check-team-permissions-for-a-repository
     */
    "GET /orgs/{org}/teams/{team_slug}/repos/{owner}/{repo}": Operation<"/orgs/{org}/teams/{team_slug}/repos/{owner}/{repo}", "get">;
    /**
     * @see https://docs.github.com/rest/teams/teams#list-child-teams
     */
    "GET /orgs/{org}/teams/{team_slug}/teams": Operation<"/orgs/{org}/teams/{team_slug}/teams", "get">;
    /**
     * @see https://docs.github.com/rest/projects/cards#get-a-project-card
     */
    "GET /projects/columns/cards/{card_id}": Operation<"/projects/columns/cards/{card_id}", "get">;
    /**
     * @see https://docs.github.com/rest/projects/columns#get-a-project-column
     */
    "GET /projects/columns/{column_id}": Operation<"/projects/columns/{column_id}", "get">;
    /**
     * @see https://docs.github.com/rest/projects/cards#list-project-cards
     */
    "GET /projects/columns/{column_id}/cards": Operation<"/projects/columns/{column_id}/cards", "get">;
    /**
     * @see https://docs.github.com/rest/projects/projects#get-a-project
     */
    "GET /projects/{project_id}": Operation<"/projects/{project_id}", "get">;
    /**
     * @see https://docs.github.com/rest/projects/collaborators#list-project-collaborators
     */
    "GET /projects/{project_id}/collaborators": Operation<"/projects/{project_id}/collaborators", "get">;
    /**
     * @see https://docs.github.com/rest/projects/collaborators#get-project-permission-for-a-user
     */
    "GET /projects/{project_id}/collaborators/{username}/permission": Operation<"/projects/{project_id}/collaborators/{username}/permission", "get">;
    /**
     * @see https://docs.github.com/rest/projects/columns#list-project-columns
     */
    "GET /projects/{project_id}/columns": Operation<"/projects/{project_id}/columns", "get">;
    /**
     * @see https://docs.github.com/rest/rate-limit/rate-limit#get-rate-limit-status-for-the-authenticated-user
     */
    "GET /rate_limit": Operation<"/rate_limit", "get">;
    /**
     * @see https://docs.github.com/rest/repos/repos#get-a-repository
     */
    "GET /repos/{owner}/{repo}": Operation<"/repos/{owner}/{repo}", "get">;
    /**
     * @see https://docs.github.com/rest/actions/artifacts#list-artifacts-for-a-repository
     */
    "GET /repos/{owner}/{repo}/actions/artifacts": Operation<"/repos/{owner}/{repo}/actions/artifacts", "get">;
    /**
     * @see https://docs.github.com/rest/actions/artifacts#get-an-artifact
     */
    "GET /repos/{owner}/{repo}/actions/artifacts/{artifact_id}": Operation<"/repos/{owner}/{repo}/actions/artifacts/{artifact_id}", "get">;
    /**
     * @see https://docs.github.com/rest/actions/artifacts#download-an-artifact
     */
    "GET /repos/{owner}/{repo}/actions/artifacts/{artifact_id}/{archive_format}": Operation<"/repos/{owner}/{repo}/actions/artifacts/{artifact_id}/{archive_format}", "get">;
    /**
     * @see https://docs.github.com/rest/actions/cache#get-github-actions-cache-usage-for-a-repository
     */
    "GET /repos/{owner}/{repo}/actions/cache/usage": Operation<"/repos/{owner}/{repo}/actions/cache/usage", "get">;
    /**
     * @see https://docs.github.com/rest/actions/cache#list-github-actions-caches-for-a-repository
     */
    "GET /repos/{owner}/{repo}/actions/caches": Operation<"/repos/{owner}/{repo}/actions/caches", "get">;
    /**
     * @see https://docs.github.com/rest/actions/workflow-jobs#get-a-job-for-a-workflow-run
     */
    "GET /repos/{owner}/{repo}/actions/jobs/{job_id}": Operation<"/repos/{owner}/{repo}/actions/jobs/{job_id}", "get">;
    /**
     * @see https://docs.github.com/rest/actions/workflow-jobs#download-job-logs-for-a-workflow-run
     */
    "GET /repos/{owner}/{repo}/actions/jobs/{job_id}/logs": Operation<"/repos/{owner}/{repo}/actions/jobs/{job_id}/logs", "get">;
    /**
     * @see https://docs.github.com/rest/actions/oidc#get-the-customization-template-for-an-oidc-subject-claim-for-a-repository
     */
    "GET /repos/{owner}/{repo}/actions/oidc/customization/sub": Operation<"/repos/{owner}/{repo}/actions/oidc/customization/sub", "get">;
    /**
     * @see https://docs.github.com/rest/actions/secrets#list-repository-organization-secrets
     */
    "GET /repos/{owner}/{repo}/actions/organization-secrets": Operation<"/repos/{owner}/{repo}/actions/organization-secrets", "get">;
    /**
     * @see https://docs.github.com/rest/actions/variables#list-repository-organization-variables
     */
    "GET /repos/{owner}/{repo}/actions/organization-variables": Operation<"/repos/{owner}/{repo}/actions/organization-variables", "get">;
    /**
     * @see https://docs.github.com/rest/actions/permissions#get-github-actions-permissions-for-a-repository
     */
    "GET /repos/{owner}/{repo}/actions/permissions": Operation<"/repos/{owner}/{repo}/actions/permissions", "get">;
    /**
     * @see https://docs.github.com/rest/actions/permissions#get-the-level-of-access-for-workflows-outside-of-the-repository
     */
    "GET /repos/{owner}/{repo}/actions/permissions/access": Operation<"/repos/{owner}/{repo}/actions/permissions/access", "get">;
    /**
     * @see https://docs.github.com/rest/actions/permissions#get-allowed-actions-and-reusable-workflows-for-a-repository
     */
    "GET /repos/{owner}/{repo}/actions/permissions/selected-actions": Operation<"/repos/{owner}/{repo}/actions/permissions/selected-actions", "get">;
    /**
     * @see https://docs.github.com/rest/actions/permissions#get-default-workflow-permissions-for-a-repository
     */
    "GET /repos/{owner}/{repo}/actions/permissions/workflow": Operation<"/repos/{owner}/{repo}/actions/permissions/workflow", "get">;
    /**
     * @see https://docs.github.com/rest/actions/self-hosted-runners#list-self-hosted-runners-for-a-repository
     */
    "GET /repos/{owner}/{repo}/actions/runners": Operation<"/repos/{owner}/{repo}/actions/runners", "get">;
    /**
     * @see https://docs.github.com/rest/actions/self-hosted-runners#list-runner-applications-for-a-repository
     */
    "GET /repos/{owner}/{repo}/actions/runners/downloads": Operation<"/repos/{owner}/{repo}/actions/runners/downloads", "get">;
    /**
     * @see https://docs.github.com/rest/actions/self-hosted-runners#get-a-self-hosted-runner-for-a-repository
     */
    "GET /repos/{owner}/{repo}/actions/runners/{runner_id}": Operation<"/repos/{owner}/{repo}/actions/runners/{runner_id}", "get">;
    /**
     * @see https://docs.github.com/rest/actions/self-hosted-runners#list-labels-for-a-self-hosted-runner-for-a-repository
     */
    "GET /repos/{owner}/{repo}/actions/runners/{runner_id}/labels": Operation<"/repos/{owner}/{repo}/actions/runners/{runner_id}/labels", "get">;
    /**
     * @see https://docs.github.com/rest/actions/workflow-runs#list-workflow-runs-for-a-repository
     */
    "GET /repos/{owner}/{repo}/actions/runs": Operation<"/repos/{owner}/{repo}/actions/runs", "get">;
    /**
     * @see https://docs.github.com/rest/actions/workflow-runs#get-a-workflow-run
     */
    "GET /repos/{owner}/{repo}/actions/runs/{run_id}": Operation<"/repos/{owner}/{repo}/actions/runs/{run_id}", "get">;
    /**
     * @see https://docs.github.com/rest/actions/workflow-runs#get-the-review-history-for-a-workflow-run
     */
    "GET /repos/{owner}/{repo}/actions/runs/{run_id}/approvals": Operation<"/repos/{owner}/{repo}/actions/runs/{run_id}/approvals", "get">;
    /**
     * @see https://docs.github.com/rest/actions/artifacts#list-workflow-run-artifacts
     */
    "GET /repos/{owner}/{repo}/actions/runs/{run_id}/artifacts": Operation<"/repos/{owner}/{repo}/actions/runs/{run_id}/artifacts", "get">;
    /**
     * @see https://docs.github.com/rest/actions/workflow-runs#get-a-workflow-run-attempt
     */
    "GET /repos/{owner}/{repo}/actions/runs/{run_id}/attempts/{attempt_number}": Operation<"/repos/{owner}/{repo}/actions/runs/{run_id}/attempts/{attempt_number}", "get">;
    /**
     * @see https://docs.github.com/rest/actions/workflow-jobs#list-jobs-for-a-workflow-run-attempt
     */
    "GET /repos/{owner}/{repo}/actions/runs/{run_id}/attempts/{attempt_number}/jobs": Operation<"/repos/{owner}/{repo}/actions/runs/{run_id}/attempts/{attempt_number}/jobs", "get">;
    /**
     * @see https://docs.github.com/rest/actions/workflow-runs#download-workflow-run-attempt-logs
     */
    "GET /repos/{owner}/{repo}/actions/runs/{run_id}/attempts/{attempt_number}/logs": Operation<"/repos/{owner}/{repo}/actions/runs/{run_id}/attempts/{attempt_number}/logs", "get">;
    /**
     * @see https://docs.github.com/rest/actions/workflow-jobs#list-jobs-for-a-workflow-run
     */
    "GET /repos/{owner}/{repo}/actions/runs/{run_id}/jobs": Operation<"/repos/{owner}/{repo}/actions/runs/{run_id}/jobs", "get">;
    /**
     * @see https://docs.github.com/rest/actions/workflow-runs#download-workflow-run-logs
     */
    "GET /repos/{owner}/{repo}/actions/runs/{run_id}/logs": Operation<"/repos/{owner}/{repo}/actions/runs/{run_id}/logs", "get">;
    /**
     * @see https://docs.github.com/rest/actions/workflow-runs#get-pending-deployments-for-a-workflow-run
     */
    "GET /repos/{owner}/{repo}/actions/runs/{run_id}/pending_deployments": Operation<"/repos/{owner}/{repo}/actions/runs/{run_id}/pending_deployments", "get">;
    /**
     * @see https://docs.github.com/rest/actions/workflow-runs#get-workflow-run-usage
     */
    "GET /repos/{owner}/{repo}/actions/runs/{run_id}/timing": Operation<"/repos/{owner}/{repo}/actions/runs/{run_id}/timing", "get">;
    /**
     * @see https://docs.github.com/rest/actions/secrets#list-repository-secrets
     */
    "GET /repos/{owner}/{repo}/actions/secrets": Operation<"/repos/{owner}/{repo}/actions/secrets", "get">;
    /**
     * @see https://docs.github.com/rest/actions/secrets#get-a-repository-public-key
     */
    "GET /repos/{owner}/{repo}/actions/secrets/public-key": Operation<"/repos/{owner}/{repo}/actions/secrets/public-key", "get">;
    /**
     * @see https://docs.github.com/rest/actions/secrets#get-a-repository-secret
     */
    "GET /repos/{owner}/{repo}/actions/secrets/{secret_name}": Operation<"/repos/{owner}/{repo}/actions/secrets/{secret_name}", "get">;
    /**
     * @see https://docs.github.com/rest/actions/variables#list-repository-variables
     */
    "GET /repos/{owner}/{repo}/actions/variables": Operation<"/repos/{owner}/{repo}/actions/variables", "get">;
    /**
     * @see https://docs.github.com/rest/actions/variables#get-a-repository-variable
     */
    "GET /repos/{owner}/{repo}/actions/variables/{name}": Operation<"/repos/{owner}/{repo}/actions/variables/{name}", "get">;
    /**
     * @see https://docs.github.com/rest/actions/workflows#list-repository-workflows
     */
    "GET /repos/{owner}/{repo}/actions/workflows": Operation<"/repos/{owner}/{repo}/actions/workflows", "get">;
    /**
     * @see https://docs.github.com/rest/actions/workflows#get-a-workflow
     */
    "GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}": Operation<"/repos/{owner}/{repo}/actions/workflows/{workflow_id}", "get">;
    /**
     * @see https://docs.github.com/rest/actions/workflow-runs#list-workflow-runs-for-a-workflow
     */
    "GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}/runs": Operation<"/repos/{owner}/{repo}/actions/workflows/{workflow_id}/runs", "get">;
    /**
     * @see https://docs.github.com/rest/actions/workflows#get-workflow-usage
     */
    "GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}/timing": Operation<"/repos/{owner}/{repo}/actions/workflows/{workflow_id}/timing", "get">;
    /**
     * @see https://docs.github.com/rest/repos/repos#list-repository-activities
     */
    "GET /repos/{owner}/{repo}/activity": Operation<"/repos/{owner}/{repo}/activity", "get">;
    /**
     * @see https://docs.github.com/rest/issues/assignees#list-assignees
     */
    "GET /repos/{owner}/{repo}/assignees": Operation<"/repos/{owner}/{repo}/assignees", "get">;
    /**
     * @see https://docs.github.com/rest/issues/assignees#check-if-a-user-can-be-assigned
     */
    "GET /repos/{owner}/{repo}/assignees/{assignee}": Operation<"/repos/{owner}/{repo}/assignees/{assignee}", "get">;
    /**
     * @see https://docs.github.com/rest/repos/repos#list-attestations
     */
    "GET /repos/{owner}/{repo}/attestations/{subject_digest}": Operation<"/repos/{owner}/{repo}/attestations/{subject_digest}", "get">;
    /**
     * @see https://docs.github.com/rest/repos/autolinks#get-all-autolinks-of-a-repository
     */
    "GET /repos/{owner}/{repo}/autolinks": Operation<"/repos/{owner}/{repo}/autolinks", "get">;
    /**
     * @see https://docs.github.com/rest/repos/autolinks#get-an-autolink-reference-of-a-repository
     */
    "GET /repos/{owner}/{repo}/autolinks/{autolink_id}": Operation<"/repos/{owner}/{repo}/autolinks/{autolink_id}", "get">;
    /**
     * @see https://docs.github.com/rest/repos/repos#check-if-dependabot-security-updates-are-enabled-for-a-repository
     */
    "GET /repos/{owner}/{repo}/automated-security-fixes": Operation<"/repos/{owner}/{repo}/automated-security-fixes", "get">;
    /**
     * @see https://docs.github.com/rest/branches/branches#list-branches
     */
    "GET /repos/{owner}/{repo}/branches": Operation<"/repos/{owner}/{repo}/branches", "get">;
    /**
     * @see https://docs.github.com/rest/branches/branches#get-a-branch
     */
    "GET /repos/{owner}/{repo}/branches/{branch}": Operation<"/repos/{owner}/{repo}/branches/{branch}", "get">;
    /**
     * @see https://docs.github.com/rest/branches/branch-protection#get-branch-protection
     */
    "GET /repos/{owner}/{repo}/branches/{branch}/protection": Operation<"/repos/{owner}/{repo}/branches/{branch}/protection", "get">;
    /**
     * @see https://docs.github.com/rest/branches/branch-protection#get-admin-branch-protection
     */
    "GET /repos/{owner}/{repo}/branches/{branch}/protection/enforce_admins": Operation<"/repos/{owner}/{repo}/branches/{branch}/protection/enforce_admins", "get">;
    /**
     * @see https://docs.github.com/rest/branches/branch-protection#get-pull-request-review-protection
     */
    "GET /repos/{owner}/{repo}/branches/{branch}/protection/required_pull_request_reviews": Operation<"/repos/{owner}/{repo}/branches/{branch}/protection/required_pull_request_reviews", "get">;
    /**
     * @see https://docs.github.com/rest/branches/branch-protection#get-commit-signature-protection
     */
    "GET /repos/{owner}/{repo}/branches/{branch}/protection/required_signatures": Operation<"/repos/{owner}/{repo}/branches/{branch}/protection/required_signatures", "get">;
    /**
     * @see https://docs.github.com/rest/branches/branch-protection#get-status-checks-protection
     */
    "GET /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks": Operation<"/repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks", "get">;
    /**
     * @see https://docs.github.com/rest/branches/branch-protection#get-all-status-check-contexts
     */
    "GET /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks/contexts": Operation<"/repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks/contexts", "get">;
    /**
     * @see https://docs.github.com/rest/branches/branch-protection#get-access-restrictions
     */
    "GET /repos/{owner}/{repo}/branches/{branch}/protection/restrictions": Operation<"/repos/{owner}/{repo}/branches/{branch}/protection/restrictions", "get">;
    /**
     * @see https://docs.github.com/rest/branches/branch-protection#get-apps-with-access-to-the-protected-branch
     */
    "GET /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/apps": Operation<"/repos/{owner}/{repo}/branches/{branch}/protection/restrictions/apps", "get">;
    /**
     * @see https://docs.github.com/rest/branches/branch-protection#get-teams-with-access-to-the-protected-branch
     */
    "GET /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/teams": Operation<"/repos/{owner}/{repo}/branches/{branch}/protection/restrictions/teams", "get">;
    /**
     * @see https://docs.github.com/rest/branches/branch-protection#get-users-with-access-to-the-protected-branch
     */
    "GET /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/users": Operation<"/repos/{owner}/{repo}/branches/{branch}/protection/restrictions/users", "get">;
    /**
     * @see https://docs.github.com/rest/checks/runs#get-a-check-run
     */
    "GET /repos/{owner}/{repo}/check-runs/{check_run_id}": Operation<"/repos/{owner}/{repo}/check-runs/{check_run_id}", "get">;
    /**
     * @see https://docs.github.com/rest/checks/runs#list-check-run-annotations
     */
    "GET /repos/{owner}/{repo}/check-runs/{check_run_id}/annotations": Operation<"/repos/{owner}/{repo}/check-runs/{check_run_id}/annotations", "get">;
    /**
     * @see https://docs.github.com/rest/checks/suites#get-a-check-suite
     */
    "GET /repos/{owner}/{repo}/check-suites/{check_suite_id}": Operation<"/repos/{owner}/{repo}/check-suites/{check_suite_id}", "get">;
    /**
     * @see https://docs.github.com/rest/checks/runs#list-check-runs-in-a-check-suite
     */
    "GET /repos/{owner}/{repo}/check-suites/{check_suite_id}/check-runs": Operation<"/repos/{owner}/{repo}/check-suites/{check_suite_id}/check-runs", "get">;
    /**
     * @see https://docs.github.com/rest/reference/code-scanning#list-code-scanning-alerts-for-a-repository
     */
    "GET /repos/{owner}/{repo}/code-scanning/alerts": Operation<"/repos/{owner}/{repo}/code-scanning/alerts", "get">;
    /**
     * @see https://docs.github.com/rest/code-scanning/code-scanning#get-a-code-scanning-alert
     * @deprecated "alert_id" is now "alert_number"
     */
    "GET /repos/{owner}/{repo}/code-scanning/alerts/{alert_id}": Operation<"/repos/{owner}/{repo}/code-scanning/alerts/{alert_number}", "get">;
    /**
     * @see https://docs.github.com/rest/code-scanning/code-scanning#get-a-code-scanning-alert
     */
    "GET /repos/{owner}/{repo}/code-scanning/alerts/{alert_number}": Operation<"/repos/{owner}/{repo}/code-scanning/alerts/{alert_number}", "get">;
    /**
     * @see https://docs.github.com/rest/code-scanning/code-scanning#get-the-status-of-an-autofix-for-a-code-scanning-alert
     */
    "GET /repos/{owner}/{repo}/code-scanning/alerts/{alert_number}/autofix": Operation<"/repos/{owner}/{repo}/code-scanning/alerts/{alert_number}/autofix", "get">;
    /**
     * @see https://docs.github.com/rest/code-scanning/code-scanning#list-instances-of-a-code-scanning-alert
     */
    "GET /repos/{owner}/{repo}/code-scanning/alerts/{alert_number}/instances": Operation<"/repos/{owner}/{repo}/code-scanning/alerts/{alert_number}/instances", "get">;
    /**
     * @see https://docs.github.com/rest/code-scanning/code-scanning#list-code-scanning-analyses-for-a-repository
     */
    "GET /repos/{owner}/{repo}/code-scanning/analyses": Operation<"/repos/{owner}/{repo}/code-scanning/analyses", "get">;
    /**
     * @see https://docs.github.com/rest/code-scanning/code-scanning#get-a-code-scanning-analysis-for-a-repository
     */
    "GET /repos/{owner}/{repo}/code-scanning/analyses/{analysis_id}": Operation<"/repos/{owner}/{repo}/code-scanning/analyses/{analysis_id}", "get">;
    /**
     * @see https://docs.github.com/rest/code-scanning/code-scanning#list-codeql-databases-for-a-repository
     */
    "GET /repos/{owner}/{repo}/code-scanning/codeql/databases": Operation<"/repos/{owner}/{repo}/code-scanning/codeql/databases", "get">;
    /**
     * @see https://docs.github.com/rest/code-scanning/code-scanning#get-a-codeql-database-for-a-repository
     */
    "GET /repos/{owner}/{repo}/code-scanning/codeql/databases/{language}": Operation<"/repos/{owner}/{repo}/code-scanning/codeql/databases/{language}", "get">;
    /**
     * @see https://docs.github.com/rest/code-scanning/code-scanning#get-the-summary-of-a-codeql-variant-analysis
     */
    "GET /repos/{owner}/{repo}/code-scanning/codeql/variant-analyses/{codeql_variant_analysis_id}": Operation<"/repos/{owner}/{repo}/code-scanning/codeql/variant-analyses/{codeql_variant_analysis_id}", "get">;
    /**
     * @see https://docs.github.com/rest/code-scanning/code-scanning#get-the-analysis-status-of-a-repository-in-a-codeql-variant-analysis
     */
    "GET /repos/{owner}/{repo}/code-scanning/codeql/variant-analyses/{codeql_variant_analysis_id}/repos/{repo_owner}/{repo_name}": Operation<"/repos/{owner}/{repo}/code-scanning/codeql/variant-analyses/{codeql_variant_analysis_id}/repos/{repo_owner}/{repo_name}", "get">;
    /**
     * @see https://docs.github.com/rest/code-scanning/code-scanning#get-a-code-scanning-default-setup-configuration
     */
    "GET /repos/{owner}/{repo}/code-scanning/default-setup": Operation<"/repos/{owner}/{repo}/code-scanning/default-setup", "get">;
    /**
     * @see https://docs.github.com/rest/code-scanning/code-scanning#get-information-about-a-sarif-upload
     */
    "GET /repos/{owner}/{repo}/code-scanning/sarifs/{sarif_id}": Operation<"/repos/{owner}/{repo}/code-scanning/sarifs/{sarif_id}", "get">;
    /**
     * @see https://docs.github.com/rest/code-security/configurations#get-the-code-security-configuration-associated-with-a-repository
     */
    "GET /repos/{owner}/{repo}/code-security-configuration": Operation<"/repos/{owner}/{repo}/code-security-configuration", "get">;
    /**
     * @see https://docs.github.com/rest/repos/repos#list-codeowners-errors
     */
    "GET /repos/{owner}/{repo}/codeowners/errors": Operation<"/repos/{owner}/{repo}/codeowners/errors", "get">;
    /**
     * @see https://docs.github.com/rest/codespaces/codespaces#list-codespaces-in-a-repository-for-the-authenticated-user
     */
    "GET /repos/{owner}/{repo}/codespaces": Operation<"/repos/{owner}/{repo}/codespaces", "get">;
    /**
     * @see https://docs.github.com/rest/codespaces/codespaces#list-devcontainer-configurations-in-a-repository-for-the-authenticated-user
     */
    "GET /repos/{owner}/{repo}/codespaces/devcontainers": Operation<"/repos/{owner}/{repo}/codespaces/devcontainers", "get">;
    /**
     * @see https://docs.github.com/rest/codespaces/machines#list-available-machine-types-for-a-repository
     */
    "GET /repos/{owner}/{repo}/codespaces/machines": Operation<"/repos/{owner}/{repo}/codespaces/machines", "get">;
    /**
     * @see https://docs.github.com/rest/codespaces/codespaces#get-default-attributes-for-a-codespace
     */
    "GET /repos/{owner}/{repo}/codespaces/new": Operation<"/repos/{owner}/{repo}/codespaces/new", "get">;
    /**
     * @see https://docs.github.com/rest/codespaces/codespaces#check-if-permissions-defined-by-a-devcontainer-have-been-accepted-by-the-authenticated-user
     */
    "GET /repos/{owner}/{repo}/codespaces/permissions_check": Operation<"/repos/{owner}/{repo}/codespaces/permissions_check", "get">;
    /**
     * @see https://docs.github.com/rest/codespaces/repository-secrets#list-repository-secrets
     */
    "GET /repos/{owner}/{repo}/codespaces/secrets": Operation<"/repos/{owner}/{repo}/codespaces/secrets", "get">;
    /**
     * @see https://docs.github.com/rest/codespaces/repository-secrets#get-a-repository-public-key
     */
    "GET /repos/{owner}/{repo}/codespaces/secrets/public-key": Operation<"/repos/{owner}/{repo}/codespaces/secrets/public-key", "get">;
    /**
     * @see https://docs.github.com/rest/codespaces/repository-secrets#get-a-repository-secret
     */
    "GET /repos/{owner}/{repo}/codespaces/secrets/{secret_name}": Operation<"/repos/{owner}/{repo}/codespaces/secrets/{secret_name}", "get">;
    /**
     * @see https://docs.github.com/rest/collaborators/collaborators#list-repository-collaborators
     */
    "GET /repos/{owner}/{repo}/collaborators": Operation<"/repos/{owner}/{repo}/collaborators", "get">;
    /**
     * @see https://docs.github.com/rest/collaborators/collaborators#check-if-a-user-is-a-repository-collaborator
     */
    "GET /repos/{owner}/{repo}/collaborators/{username}": Operation<"/repos/{owner}/{repo}/collaborators/{username}", "get">;
    /**
     * @see https://docs.github.com/rest/collaborators/collaborators#get-repository-permissions-for-a-user
     */
    "GET /repos/{owner}/{repo}/collaborators/{username}/permission": Operation<"/repos/{owner}/{repo}/collaborators/{username}/permission", "get">;
    /**
     * @see https://docs.github.com/rest/commits/comments#list-commit-comments-for-a-repository
     */
    "GET /repos/{owner}/{repo}/comments": Operation<"/repos/{owner}/{repo}/comments", "get">;
    /**
     * @see https://docs.github.com/rest/commits/comments#get-a-commit-comment
     */
    "GET /repos/{owner}/{repo}/comments/{comment_id}": Operation<"/repos/{owner}/{repo}/comments/{comment_id}", "get">;
    /**
     * @see https://docs.github.com/rest/reactions/reactions#list-reactions-for-a-commit-comment
     */
    "GET /repos/{owner}/{repo}/comments/{comment_id}/reactions": Operation<"/repos/{owner}/{repo}/comments/{comment_id}/reactions", "get">;
    /**
     * @see https://docs.github.com/rest/commits/commits#list-commits
     */
    "GET /repos/{owner}/{repo}/commits": Operation<"/repos/{owner}/{repo}/commits", "get">;
    /**
     * @see https://docs.github.com/rest/commits/commits#list-branches-for-head-commit
     */
    "GET /repos/{owner}/{repo}/commits/{commit_sha}/branches-where-head": Operation<"/repos/{owner}/{repo}/commits/{commit_sha}/branches-where-head", "get">;
    /**
     * @see https://docs.github.com/rest/commits/comments#list-commit-comments
     */
    "GET /repos/{owner}/{repo}/commits/{commit_sha}/comments": Operation<"/repos/{owner}/{repo}/commits/{commit_sha}/comments", "get">;
    /**
     * @see https://docs.github.com/rest/commits/commits#list-pull-requests-associated-with-a-commit
     */
    "GET /repos/{owner}/{repo}/commits/{commit_sha}/pulls": Operation<"/repos/{owner}/{repo}/commits/{commit_sha}/pulls", "get">;
    /**
     * @see https://docs.github.com/rest/commits/commits#get-a-commit
     */
    "GET /repos/{owner}/{repo}/commits/{ref}": Operation<"/repos/{owner}/{repo}/commits/{ref}", "get">;
    /**
     * @see https://docs.github.com/rest/checks/runs#list-check-runs-for-a-git-reference
     */
    "GET /repos/{owner}/{repo}/commits/{ref}/check-runs": Operation<"/repos/{owner}/{repo}/commits/{ref}/check-runs", "get">;
    /**
     * @see https://docs.github.com/rest/checks/suites#list-check-suites-for-a-git-reference
     */
    "GET /repos/{owner}/{repo}/commits/{ref}/check-suites": Operation<"/repos/{owner}/{repo}/commits/{ref}/check-suites", "get">;
    /**
     * @see https://docs.github.com/rest/commits/statuses#get-the-combined-status-for-a-specific-reference
     */
    "GET /repos/{owner}/{repo}/commits/{ref}/status": Operation<"/repos/{owner}/{repo}/commits/{ref}/status", "get">;
    /**
     * @see https://docs.github.com/rest/commits/statuses#list-commit-statuses-for-a-reference
     */
    "GET /repos/{owner}/{repo}/commits/{ref}/statuses": Operation<"/repos/{owner}/{repo}/commits/{ref}/statuses", "get">;
    /**
     * @see https://docs.github.com/rest/metrics/community#get-community-profile-metrics
     */
    "GET /repos/{owner}/{repo}/community/profile": Operation<"/repos/{owner}/{repo}/community/profile", "get">;
    /**
     * @see https://docs.github.com/rest/commits/commits#compare-two-commits
     */
    "GET /repos/{owner}/{repo}/compare/{basehead}": Operation<"/repos/{owner}/{repo}/compare/{basehead}", "get">;
    /**
     * @see https://docs.github.com/rest/reference/repos#compare-two-commits
     */
    "GET /repos/{owner}/{repo}/compare/{base}...{head}": Operation<"/repos/{owner}/{repo}/compare/{base}...{head}", "get">;
    /**
     * @see https://docs.github.com/rest/repos/contents#get-repository-content
     */
    "GET /repos/{owner}/{repo}/contents/{path}": Operation<"/repos/{owner}/{repo}/contents/{path}", "get">;
    /**
     * @see https://docs.github.com/rest/repos/repos#list-repository-contributors
     */
    "GET /repos/{owner}/{repo}/contributors": Operation<"/repos/{owner}/{repo}/contributors", "get">;
    /**
     * @see https://docs.github.com/rest/dependabot/alerts#list-dependabot-alerts-for-a-repository
     */
    "GET /repos/{owner}/{repo}/dependabot/alerts": Operation<"/repos/{owner}/{repo}/dependabot/alerts", "get">;
    /**
     * @see https://docs.github.com/rest/dependabot/alerts#get-a-dependabot-alert
     */
    "GET /repos/{owner}/{repo}/dependabot/alerts/{alert_number}": Operation<"/repos/{owner}/{repo}/dependabot/alerts/{alert_number}", "get">;
    /**
     * @see https://docs.github.com/rest/dependabot/secrets#list-repository-secrets
     */
    "GET /repos/{owner}/{repo}/dependabot/secrets": Operation<"/repos/{owner}/{repo}/dependabot/secrets", "get">;
    /**
     * @see https://docs.github.com/rest/dependabot/secrets#get-a-repository-public-key
     */
    "GET /repos/{owner}/{repo}/dependabot/secrets/public-key": Operation<"/repos/{owner}/{repo}/dependabot/secrets/public-key", "get">;
    /**
     * @see https://docs.github.com/rest/dependabot/secrets#get-a-repository-secret
     */
    "GET /repos/{owner}/{repo}/dependabot/secrets/{secret_name}": Operation<"/repos/{owner}/{repo}/dependabot/secrets/{secret_name}", "get">;
    /**
     * @see https://docs.github.com/rest/dependency-graph/dependency-review#get-a-diff-of-the-dependencies-between-commits
     */
    "GET /repos/{owner}/{repo}/dependency-graph/compare/{basehead}": Operation<"/repos/{owner}/{repo}/dependency-graph/compare/{basehead}", "get">;
    /**
     * @see https://docs.github.com/rest/dependency-graph/sboms#export-a-software-bill-of-materials-sbom-for-a-repository
     */
    "GET /repos/{owner}/{repo}/dependency-graph/sbom": Operation<"/repos/{owner}/{repo}/dependency-graph/sbom", "get">;
    /**
     * @see https://docs.github.com/rest/deployments/deployments#list-deployments
     */
    "GET /repos/{owner}/{repo}/deployments": Operation<"/repos/{owner}/{repo}/deployments", "get">;
    /**
     * @see https://docs.github.com/rest/deployments/deployments#get-a-deployment
     */
    "GET /repos/{owner}/{repo}/deployments/{deployment_id}": Operation<"/repos/{owner}/{repo}/deployments/{deployment_id}", "get">;
    /**
     * @see https://docs.github.com/rest/deployments/statuses#list-deployment-statuses
     */
    "GET /repos/{owner}/{repo}/deployments/{deployment_id}/statuses": Operation<"/repos/{owner}/{repo}/deployments/{deployment_id}/statuses", "get">;
    /**
     * @see https://docs.github.com/rest/deployments/statuses#get-a-deployment-status
     */
    "GET /repos/{owner}/{repo}/deployments/{deployment_id}/statuses/{status_id}": Operation<"/repos/{owner}/{repo}/deployments/{deployment_id}/statuses/{status_id}", "get">;
    /**
     * @see https://docs.github.com/rest/deployments/environments#list-environments
     */
    "GET /repos/{owner}/{repo}/environments": Operation<"/repos/{owner}/{repo}/environments", "get">;
    /**
     * @see https://docs.github.com/rest/deployments/environments#get-an-environment
     */
    "GET /repos/{owner}/{repo}/environments/{environment_name}": Operation<"/repos/{owner}/{repo}/environments/{environment_name}", "get">;
    /**
     * @see https://docs.github.com/rest/deployments/branch-policies#list-deployment-branch-policies
     */
    "GET /repos/{owner}/{repo}/environments/{environment_name}/deployment-branch-policies": Operation<"/repos/{owner}/{repo}/environments/{environment_name}/deployment-branch-policies", "get">;
    /**
     * @see https://docs.github.com/rest/deployments/branch-policies#get-a-deployment-branch-policy
     */
    "GET /repos/{owner}/{repo}/environments/{environment_name}/deployment-branch-policies/{branch_policy_id}": Operation<"/repos/{owner}/{repo}/environments/{environment_name}/deployment-branch-policies/{branch_policy_id}", "get">;
    /**
     * @see https://docs.github.com/rest/deployments/protection-rules#get-all-deployment-protection-rules-for-an-environment
     */
    "GET /repos/{owner}/{repo}/environments/{environment_name}/deployment_protection_rules": Operation<"/repos/{owner}/{repo}/environments/{environment_name}/deployment_protection_rules", "get">;
    /**
     * @see https://docs.github.com/rest/deployments/protection-rules#list-custom-deployment-rule-integrations-available-for-an-environment
     */
    "GET /repos/{owner}/{repo}/environments/{environment_name}/deployment_protection_rules/apps": Operation<"/repos/{owner}/{repo}/environments/{environment_name}/deployment_protection_rules/apps", "get">;
    /**
     * @see https://docs.github.com/rest/deployments/protection-rules#get-a-custom-deployment-protection-rule
     */
    "GET /repos/{owner}/{repo}/environments/{environment_name}/deployment_protection_rules/{protection_rule_id}": Operation<"/repos/{owner}/{repo}/environments/{environment_name}/deployment_protection_rules/{protection_rule_id}", "get">;
    /**
     * @see https://docs.github.com/rest/actions/secrets#list-environment-secrets
     */
    "GET /repos/{owner}/{repo}/environments/{environment_name}/secrets": Operation<"/repos/{owner}/{repo}/environments/{environment_name}/secrets", "get">;
    /**
     * @see https://docs.github.com/rest/actions/secrets#get-an-environment-public-key
     */
    "GET /repos/{owner}/{repo}/environments/{environment_name}/secrets/public-key": Operation<"/repos/{owner}/{repo}/environments/{environment_name}/secrets/public-key", "get">;
    /**
     * @see https://docs.github.com/rest/actions/secrets#get-an-environment-secret
     */
    "GET /repos/{owner}/{repo}/environments/{environment_name}/secrets/{secret_name}": Operation<"/repos/{owner}/{repo}/environments/{environment_name}/secrets/{secret_name}", "get">;
    /**
     * @see https://docs.github.com/rest/actions/variables#list-environment-variables
     */
    "GET /repos/{owner}/{repo}/environments/{environment_name}/variables": Operation<"/repos/{owner}/{repo}/environments/{environment_name}/variables", "get">;
    /**
     * @see https://docs.github.com/rest/actions/variables#get-an-environment-variable
     */
    "GET /repos/{owner}/{repo}/environments/{environment_name}/variables/{name}": Operation<"/repos/{owner}/{repo}/environments/{environment_name}/variables/{name}", "get">;
    /**
     * @see https://docs.github.com/rest/activity/events#list-repository-events
     */
    "GET /repos/{owner}/{repo}/events": Operation<"/repos/{owner}/{repo}/events", "get">;
    /**
     * @see https://docs.github.com/rest/repos/forks#list-forks
     */
    "GET /repos/{owner}/{repo}/forks": Operation<"/repos/{owner}/{repo}/forks", "get">;
    /**
     * @see https://docs.github.com/rest/git/blobs#get-a-blob
     */
    "GET /repos/{owner}/{repo}/git/blobs/{file_sha}": Operation<"/repos/{owner}/{repo}/git/blobs/{file_sha}", "get">;
    /**
     * @see https://docs.github.com/rest/git/commits#get-a-commit-object
     */
    "GET /repos/{owner}/{repo}/git/commits/{commit_sha}": Operation<"/repos/{owner}/{repo}/git/commits/{commit_sha}", "get">;
    /**
     * @see https://docs.github.com/rest/git/refs#list-matching-references
     */
    "GET /repos/{owner}/{repo}/git/matching-refs/{ref}": Operation<"/repos/{owner}/{repo}/git/matching-refs/{ref}", "get">;
    /**
     * @see https://docs.github.com/rest/git/refs#get-a-reference
     */
    "GET /repos/{owner}/{repo}/git/ref/{ref}": Operation<"/repos/{owner}/{repo}/git/ref/{ref}", "get">;
    /**
     * @see https://docs.github.com/rest/git/tags#get-a-tag
     */
    "GET /repos/{owner}/{repo}/git/tags/{tag_sha}": Operation<"/repos/{owner}/{repo}/git/tags/{tag_sha}", "get">;
    /**
     * @see https://docs.github.com/rest/git/trees#get-a-tree
     */
    "GET /repos/{owner}/{repo}/git/trees/{tree_sha}": Operation<"/repos/{owner}/{repo}/git/trees/{tree_sha}", "get">;
    /**
     * @see https://docs.github.com/rest/repos/webhooks#list-repository-webhooks
     */
    "GET /repos/{owner}/{repo}/hooks": Operation<"/repos/{owner}/{repo}/hooks", "get">;
    /**
     * @see https://docs.github.com/rest/repos/webhooks#get-a-repository-webhook
     */
    "GET /repos/{owner}/{repo}/hooks/{hook_id}": Operation<"/repos/{owner}/{repo}/hooks/{hook_id}", "get">;
    /**
     * @see https://docs.github.com/rest/repos/webhooks#get-a-webhook-configuration-for-a-repository
     */
    "GET /repos/{owner}/{repo}/hooks/{hook_id}/config": Operation<"/repos/{owner}/{repo}/hooks/{hook_id}/config", "get">;
    /**
     * @see https://docs.github.com/rest/repos/webhooks#list-deliveries-for-a-repository-webhook
     */
    "GET /repos/{owner}/{repo}/hooks/{hook_id}/deliveries": Operation<"/repos/{owner}/{repo}/hooks/{hook_id}/deliveries", "get">;
    /**
     * @see https://docs.github.com/rest/repos/webhooks#get-a-delivery-for-a-repository-webhook
     */
    "GET /repos/{owner}/{repo}/hooks/{hook_id}/deliveries/{delivery_id}": Operation<"/repos/{owner}/{repo}/hooks/{hook_id}/deliveries/{delivery_id}", "get">;
    /**
     * @see https://docs.github.com/rest/migrations/source-imports#get-an-import-status
     */
    "GET /repos/{owner}/{repo}/import": Operation<"/repos/{owner}/{repo}/import", "get">;
    /**
     * @see https://docs.github.com/rest/migrations/source-imports#get-commit-authors
     */
    "GET /repos/{owner}/{repo}/import/authors": Operation<"/repos/{owner}/{repo}/import/authors", "get">;
    /**
     * @see https://docs.github.com/rest/migrations/source-imports#get-large-files
     */
    "GET /repos/{owner}/{repo}/import/large_files": Operation<"/repos/{owner}/{repo}/import/large_files", "get">;
    /**
     * @see https://docs.github.com/rest/apps/apps#get-a-repository-installation-for-the-authenticated-app
     */
    "GET /repos/{owner}/{repo}/installation": Operation<"/repos/{owner}/{repo}/installation", "get">;
    /**
     * @see https://docs.github.com/rest/interactions/repos#get-interaction-restrictions-for-a-repository
     */
    "GET /repos/{owner}/{repo}/interaction-limits": Operation<"/repos/{owner}/{repo}/interaction-limits", "get">;
    /**
     * @see https://docs.github.com/rest/collaborators/invitations#list-repository-invitations
     */
    "GET /repos/{owner}/{repo}/invitations": Operation<"/repos/{owner}/{repo}/invitations", "get">;
    /**
     * @see https://docs.github.com/rest/issues/issues#list-repository-issues
     */
    "GET /repos/{owner}/{repo}/issues": Operation<"/repos/{owner}/{repo}/issues", "get">;
    /**
     * @see https://docs.github.com/rest/issues/comments#list-issue-comments-for-a-repository
     */
    "GET /repos/{owner}/{repo}/issues/comments": Operation<"/repos/{owner}/{repo}/issues/comments", "get">;
    /**
     * @see https://docs.github.com/rest/issues/comments#get-an-issue-comment
     */
    "GET /repos/{owner}/{repo}/issues/comments/{comment_id}": Operation<"/repos/{owner}/{repo}/issues/comments/{comment_id}", "get">;
    /**
     * @see https://docs.github.com/rest/reactions/reactions#list-reactions-for-an-issue-comment
     */
    "GET /repos/{owner}/{repo}/issues/comments/{comment_id}/reactions": Operation<"/repos/{owner}/{repo}/issues/comments/{comment_id}/reactions", "get">;
    /**
     * @see https://docs.github.com/rest/issues/events#list-issue-events-for-a-repository
     */
    "GET /repos/{owner}/{repo}/issues/events": Operation<"/repos/{owner}/{repo}/issues/events", "get">;
    /**
     * @see https://docs.github.com/rest/issues/events#get-an-issue-event
     */
    "GET /repos/{owner}/{repo}/issues/events/{event_id}": Operation<"/repos/{owner}/{repo}/issues/events/{event_id}", "get">;
    /**
     * @see https://docs.github.com/rest/issues/issues#get-an-issue
     */
    "GET /repos/{owner}/{repo}/issues/{issue_number}": Operation<"/repos/{owner}/{repo}/issues/{issue_number}", "get">;
    /**
     * @see https://docs.github.com/rest/issues/assignees#check-if-a-user-can-be-assigned-to-a-issue
     */
    "GET /repos/{owner}/{repo}/issues/{issue_number}/assignees/{assignee}": Operation<"/repos/{owner}/{repo}/issues/{issue_number}/assignees/{assignee}", "get">;
    /**
     * @see https://docs.github.com/rest/issues/comments#list-issue-comments
     */
    "GET /repos/{owner}/{repo}/issues/{issue_number}/comments": Operation<"/repos/{owner}/{repo}/issues/{issue_number}/comments", "get">;
    /**
     * @see https://docs.github.com/rest/issues/events#list-issue-events
     */
    "GET /repos/{owner}/{repo}/issues/{issue_number}/events": Operation<"/repos/{owner}/{repo}/issues/{issue_number}/events", "get">;
    /**
     * @see https://docs.github.com/rest/issues/labels#list-labels-for-an-issue
     */
    "GET /repos/{owner}/{repo}/issues/{issue_number}/labels": Operation<"/repos/{owner}/{repo}/issues/{issue_number}/labels", "get">;
    /**
     * @see https://docs.github.com/rest/reactions/reactions#list-reactions-for-an-issue
     */
    "GET /repos/{owner}/{repo}/issues/{issue_number}/reactions": Operation<"/repos/{owner}/{repo}/issues/{issue_number}/reactions", "get">;
    /**
     * @see https://docs.github.com/rest/issues/sub-issues#list-sub-issues
     */
    "GET /repos/{owner}/{repo}/issues/{issue_number}/sub_issues": Operation<"/repos/{owner}/{repo}/issues/{issue_number}/sub_issues", "get">;
    /**
     * @see https://docs.github.com/rest/issues/timeline#list-timeline-events-for-an-issue
     */
    "GET /repos/{owner}/{repo}/issues/{issue_number}/timeline": Operation<"/repos/{owner}/{repo}/issues/{issue_number}/timeline", "get">;
    /**
     * @see https://docs.github.com/rest/deploy-keys/deploy-keys#list-deploy-keys
     */
    "GET /repos/{owner}/{repo}/keys": Operation<"/repos/{owner}/{repo}/keys", "get">;
    /**
     * @see https://docs.github.com/rest/deploy-keys/deploy-keys#get-a-deploy-key
     */
    "GET /repos/{owner}/{repo}/keys/{key_id}": Operation<"/repos/{owner}/{repo}/keys/{key_id}", "get">;
    /**
     * @see https://docs.github.com/rest/issues/labels#list-labels-for-a-repository
     */
    "GET /repos/{owner}/{repo}/labels": Operation<"/repos/{owner}/{repo}/labels", "get">;
    /**
     * @see https://docs.github.com/rest/issues/labels#get-a-label
     */
    "GET /repos/{owner}/{repo}/labels/{name}": Operation<"/repos/{owner}/{repo}/labels/{name}", "get">;
    /**
     * @see https://docs.github.com/rest/repos/repos#list-repository-languages
     */
    "GET /repos/{owner}/{repo}/languages": Operation<"/repos/{owner}/{repo}/languages", "get">;
    /**
     * @see https://docs.github.com/rest/licenses/licenses#get-the-license-for-a-repository
     */
    "GET /repos/{owner}/{repo}/license": Operation<"/repos/{owner}/{repo}/license", "get">;
    /**
     * @see https://docs.github.com/rest/issues/milestones#list-milestones
     */
    "GET /repos/{owner}/{repo}/milestones": Operation<"/repos/{owner}/{repo}/milestones", "get">;
    /**
     * @see https://docs.github.com/rest/issues/milestones#get-a-milestone
     */
    "GET /repos/{owner}/{repo}/milestones/{milestone_number}": Operation<"/repos/{owner}/{repo}/milestones/{milestone_number}", "get">;
    /**
     * @see https://docs.github.com/rest/issues/labels#list-labels-for-issues-in-a-milestone
     */
    "GET /repos/{owner}/{repo}/milestones/{milestone_number}/labels": Operation<"/repos/{owner}/{repo}/milestones/{milestone_number}/labels", "get">;
    /**
     * @see https://docs.github.com/rest/activity/notifications#list-repository-notifications-for-the-authenticated-user
     */
    "GET /repos/{owner}/{repo}/notifications": Operation<"/repos/{owner}/{repo}/notifications", "get">;
    /**
     * @see https://docs.github.com/rest/pages/pages#get-a-apiname-pages-site
     */
    "GET /repos/{owner}/{repo}/pages": Operation<"/repos/{owner}/{repo}/pages", "get">;
    /**
     * @see https://docs.github.com/rest/pages/pages#list-apiname-pages-builds
     */
    "GET /repos/{owner}/{repo}/pages/builds": Operation<"/repos/{owner}/{repo}/pages/builds", "get">;
    /**
     * @see https://docs.github.com/rest/pages/pages#get-latest-pages-build
     */
    "GET /repos/{owner}/{repo}/pages/builds/latest": Operation<"/repos/{owner}/{repo}/pages/builds/latest", "get">;
    /**
     * @see https://docs.github.com/rest/pages/pages#get-apiname-pages-build
     */
    "GET /repos/{owner}/{repo}/pages/builds/{build_id}": Operation<"/repos/{owner}/{repo}/pages/builds/{build_id}", "get">;
    /**
     * @see https://docs.github.com/rest/pages/pages#get-the-status-of-a-github-pages-deployment
     */
    "GET /repos/{owner}/{repo}/pages/deployments/{pages_deployment_id}": Operation<"/repos/{owner}/{repo}/pages/deployments/{pages_deployment_id}", "get">;
    /**
     * @see https://docs.github.com/rest/pages/pages#get-a-dns-health-check-for-github-pages
     */
    "GET /repos/{owner}/{repo}/pages/health": Operation<"/repos/{owner}/{repo}/pages/health", "get">;
    /**
     * @see https://docs.github.com/rest/repos/repos#check-if-private-vulnerability-reporting-is-enabled-for-a-repository
     */
    "GET /repos/{owner}/{repo}/private-vulnerability-reporting": Operation<"/repos/{owner}/{repo}/private-vulnerability-reporting", "get">;
    /**
     * @see https://docs.github.com/rest/projects/projects#list-repository-projects
     */
    "GET /repos/{owner}/{repo}/projects": Operation<"/repos/{owner}/{repo}/projects", "get">;
    /**
     * @see https://docs.github.com/rest/repos/custom-properties#get-all-custom-property-values-for-a-repository
     */
    "GET /repos/{owner}/{repo}/properties/values": Operation<"/repos/{owner}/{repo}/properties/values", "get">;
    /**
     * @see https://docs.github.com/rest/pulls/pulls#list-pull-requests
     */
    "GET /repos/{owner}/{repo}/pulls": Operation<"/repos/{owner}/{repo}/pulls", "get">;
    /**
     * @see https://docs.github.com/rest/pulls/comments#list-review-comments-in-a-repository
     */
    "GET /repos/{owner}/{repo}/pulls/comments": Operation<"/repos/{owner}/{repo}/pulls/comments", "get">;
    /**
     * @see https://docs.github.com/rest/pulls/comments#get-a-review-comment-for-a-pull-request
     */
    "GET /repos/{owner}/{repo}/pulls/comments/{comment_id}": Operation<"/repos/{owner}/{repo}/pulls/comments/{comment_id}", "get">;
    /**
     * @see https://docs.github.com/rest/reactions/reactions#list-reactions-for-a-pull-request-review-comment
     */
    "GET /repos/{owner}/{repo}/pulls/comments/{comment_id}/reactions": Operation<"/repos/{owner}/{repo}/pulls/comments/{comment_id}/reactions", "get">;
    /**
     * @see https://docs.github.com/rest/pulls/pulls#get-a-pull-request
     */
    "GET /repos/{owner}/{repo}/pulls/{pull_number}": Operation<"/repos/{owner}/{repo}/pulls/{pull_number}", "get">;
    /**
     * @see https://docs.github.com/rest/pulls/comments#list-review-comments-on-a-pull-request
     */
    "GET /repos/{owner}/{repo}/pulls/{pull_number}/comments": Operation<"/repos/{owner}/{repo}/pulls/{pull_number}/comments", "get">;
    /**
     * @see https://docs.github.com/rest/pulls/pulls#list-commits-on-a-pull-request
     */
    "GET /repos/{owner}/{repo}/pulls/{pull_number}/commits": Operation<"/repos/{owner}/{repo}/pulls/{pull_number}/commits", "get">;
    /**
     * @see https://docs.github.com/rest/pulls/pulls#list-pull-requests-files
     */
    "GET /repos/{owner}/{repo}/pulls/{pull_number}/files": Operation<"/repos/{owner}/{repo}/pulls/{pull_number}/files", "get">;
    /**
     * @see https://docs.github.com/rest/pulls/pulls#check-if-a-pull-request-has-been-merged
     */
    "GET /repos/{owner}/{repo}/pulls/{pull_number}/merge": Operation<"/repos/{owner}/{repo}/pulls/{pull_number}/merge", "get">;
    /**
     * @see https://docs.github.com/rest/pulls/review-requests#get-all-requested-reviewers-for-a-pull-request
     */
    "GET /repos/{owner}/{repo}/pulls/{pull_number}/requested_reviewers": Operation<"/repos/{owner}/{repo}/pulls/{pull_number}/requested_reviewers", "get">;
    /**
     * @see https://docs.github.com/rest/pulls/reviews#list-reviews-for-a-pull-request
     */
    "GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews": Operation<"/repos/{owner}/{repo}/pulls/{pull_number}/reviews", "get">;
    /**
     * @see https://docs.github.com/rest/pulls/reviews#get-a-review-for-a-pull-request
     */
    "GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}": Operation<"/repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}", "get">;
    /**
     * @see https://docs.github.com/rest/pulls/reviews#list-comments-for-a-pull-request-review
     */
    "GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}/comments": Operation<"/repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}/comments", "get">;
    /**
     * @see https://docs.github.com/rest/repos/contents#get-a-repository-readme
     */
    "GET /repos/{owner}/{repo}/readme": Operation<"/repos/{owner}/{repo}/readme", "get">;
    /**
     * @see https://docs.github.com/rest/repos/contents#get-a-repository-readme-for-a-directory
     */
    "GET /repos/{owner}/{repo}/readme/{dir}": Operation<"/repos/{owner}/{repo}/readme/{dir}", "get">;
    /**
     * @see https://docs.github.com/rest/releases/releases#list-releases
     */
    "GET /repos/{owner}/{repo}/releases": Operation<"/repos/{owner}/{repo}/releases", "get">;
    /**
     * @see https://docs.github.com/rest/releases/assets#get-a-release-asset
     */
    "GET /repos/{owner}/{repo}/releases/assets/{asset_id}": Operation<"/repos/{owner}/{repo}/releases/assets/{asset_id}", "get">;
    /**
     * @see https://docs.github.com/rest/releases/releases#get-the-latest-release
     */
    "GET /repos/{owner}/{repo}/releases/latest": Operation<"/repos/{owner}/{repo}/releases/latest", "get">;
    /**
     * @see https://docs.github.com/rest/releases/releases#get-a-release-by-tag-name
     */
    "GET /repos/{owner}/{repo}/releases/tags/{tag}": Operation<"/repos/{owner}/{repo}/releases/tags/{tag}", "get">;
    /**
     * @see https://docs.github.com/rest/releases/releases#get-a-release
     */
    "GET /repos/{owner}/{repo}/releases/{release_id}": Operation<"/repos/{owner}/{repo}/releases/{release_id}", "get">;
    /**
     * @see https://docs.github.com/rest/releases/assets#list-release-assets
     */
    "GET /repos/{owner}/{repo}/releases/{release_id}/assets": Operation<"/repos/{owner}/{repo}/releases/{release_id}/assets", "get">;
    /**
     * @see https://docs.github.com/rest/reactions/reactions#list-reactions-for-a-release
     */
    "GET /repos/{owner}/{repo}/releases/{release_id}/reactions": Operation<"/repos/{owner}/{repo}/releases/{release_id}/reactions", "get">;
    /**
     * @see https://docs.github.com/rest/repos/rules#get-rules-for-a-branch
     */
    "GET /repos/{owner}/{repo}/rules/branches/{branch}": Operation<"/repos/{owner}/{repo}/rules/branches/{branch}", "get">;
    /**
     * @see https://docs.github.com/rest/repos/rules#get-all-repository-rulesets
     */
    "GET /repos/{owner}/{repo}/rulesets": Operation<"/repos/{owner}/{repo}/rulesets", "get">;
    /**
     * @see https://docs.github.com/rest/repos/rule-suites#list-repository-rule-suites
     */
    "GET /repos/{owner}/{repo}/rulesets/rule-suites": Operation<"/repos/{owner}/{repo}/rulesets/rule-suites", "get">;
    /**
     * @see https://docs.github.com/rest/repos/rule-suites#get-a-repository-rule-suite
     */
    "GET /repos/{owner}/{repo}/rulesets/rule-suites/{rule_suite_id}": Operation<"/repos/{owner}/{repo}/rulesets/rule-suites/{rule_suite_id}", "get">;
    /**
     * @see https://docs.github.com/rest/repos/rules#get-a-repository-ruleset
     */
    "GET /repos/{owner}/{repo}/rulesets/{ruleset_id}": Operation<"/repos/{owner}/{repo}/rulesets/{ruleset_id}", "get">;
    /**
     * @see https://docs.github.com/rest/repos/rules#get-repository-ruleset-history
     */
    "GET /repos/{owner}/{repo}/rulesets/{ruleset_id}/history": Operation<"/repos/{owner}/{repo}/rulesets/{ruleset_id}/history", "get">;
    /**
     * @see https://docs.github.com/rest/repos/rules#get-repository-ruleset-version
     */
    "GET /repos/{owner}/{repo}/rulesets/{ruleset_id}/history/{version_id}": Operation<"/repos/{owner}/{repo}/rulesets/{ruleset_id}/history/{version_id}", "get">;
    /**
     * @see https://docs.github.com/rest/secret-scanning/secret-scanning#list-secret-scanning-alerts-for-a-repository
     */
    "GET /repos/{owner}/{repo}/secret-scanning/alerts": Operation<"/repos/{owner}/{repo}/secret-scanning/alerts", "get">;
    /**
     * @see https://docs.github.com/rest/secret-scanning/secret-scanning#get-a-secret-scanning-alert
     */
    "GET /repos/{owner}/{repo}/secret-scanning/alerts/{alert_number}": Operation<"/repos/{owner}/{repo}/secret-scanning/alerts/{alert_number}", "get">;
    /**
     * @see https://docs.github.com/rest/secret-scanning/secret-scanning#list-locations-for-a-secret-scanning-alert
     */
    "GET /repos/{owner}/{repo}/secret-scanning/alerts/{alert_number}/locations": Operation<"/repos/{owner}/{repo}/secret-scanning/alerts/{alert_number}/locations", "get">;
    /**
     * @see https://docs.github.com/rest/secret-scanning/secret-scanning#get-secret-scanning-scan-history-for-a-repository
     */
    "GET /repos/{owner}/{repo}/secret-scanning/scan-history": Operation<"/repos/{owner}/{repo}/secret-scanning/scan-history", "get">;
    /**
     * @see https://docs.github.com/rest/security-advisories/repository-advisories#list-repository-security-advisories
     */
    "GET /repos/{owner}/{repo}/security-advisories": Operation<"/repos/{owner}/{repo}/security-advisories", "get">;
    /**
     * @see https://docs.github.com/rest/security-advisories/repository-advisories#get-a-repository-security-advisory
     */
    "GET /repos/{owner}/{repo}/security-advisories/{ghsa_id}": Operation<"/repos/{owner}/{repo}/security-advisories/{ghsa_id}", "get">;
    /**
     * @see https://docs.github.com/rest/activity/starring#list-stargazers
     */
    "GET /repos/{owner}/{repo}/stargazers": Operation<"/repos/{owner}/{repo}/stargazers", "get">;
    /**
     * @see https://docs.github.com/rest/metrics/statistics#get-the-weekly-commit-activity
     */
    "GET /repos/{owner}/{repo}/stats/code_frequency": Operation<"/repos/{owner}/{repo}/stats/code_frequency", "get">;
    /**
     * @see https://docs.github.com/rest/metrics/statistics#get-the-last-year-of-commit-activity
     */
    "GET /repos/{owner}/{repo}/stats/commit_activity": Operation<"/repos/{owner}/{repo}/stats/commit_activity", "get">;
    /**
     * @see https://docs.github.com/rest/metrics/statistics#get-all-contributor-commit-activity
     */
    "GET /repos/{owner}/{repo}/stats/contributors": Operation<"/repos/{owner}/{repo}/stats/contributors", "get">;
    /**
     * @see https://docs.github.com/rest/metrics/statistics#get-the-weekly-commit-count
     */
    "GET /repos/{owner}/{repo}/stats/participation": Operation<"/repos/{owner}/{repo}/stats/participation", "get">;
    /**
     * @see https://docs.github.com/rest/metrics/statistics#get-the-hourly-commit-count-for-each-day
     */
    "GET /repos/{owner}/{repo}/stats/punch_card": Operation<"/repos/{owner}/{repo}/stats/punch_card", "get">;
    /**
     * @see https://docs.github.com/rest/activity/watching#list-watchers
     */
    "GET /repos/{owner}/{repo}/subscribers": Operation<"/repos/{owner}/{repo}/subscribers", "get">;
    /**
     * @see https://docs.github.com/rest/activity/watching#get-a-repository-subscription
     */
    "GET /repos/{owner}/{repo}/subscription": Operation<"/repos/{owner}/{repo}/subscription", "get">;
    /**
     * @see https://docs.github.com/rest/repos/repos#list-repository-tags
     */
    "GET /repos/{owner}/{repo}/tags": Operation<"/repos/{owner}/{repo}/tags", "get">;
    /**
     * @see https://docs.github.com/rest/repos/tags#closing-down---list-tag-protection-states-for-a-repository
     */
    "GET /repos/{owner}/{repo}/tags/protection": Operation<"/repos/{owner}/{repo}/tags/protection", "get">;
    /**
     * @see https://docs.github.com/rest/repos/contents#download-a-repository-archive-tar
     */
    "GET /repos/{owner}/{repo}/tarball/{ref}": Operation<"/repos/{owner}/{repo}/tarball/{ref}", "get">;
    /**
     * @see https://docs.github.com/rest/repos/repos#list-repository-teams
     */
    "GET /repos/{owner}/{repo}/teams": Operation<"/repos/{owner}/{repo}/teams", "get">;
    /**
     * @see https://docs.github.com/rest/repos/repos#get-all-repository-topics
     */
    "GET /repos/{owner}/{repo}/topics": Operation<"/repos/{owner}/{repo}/topics", "get">;
    /**
     * @see https://docs.github.com/rest/metrics/traffic#get-repository-clones
     */
    "GET /repos/{owner}/{repo}/traffic/clones": Operation<"/repos/{owner}/{repo}/traffic/clones", "get">;
    /**
     * @see https://docs.github.com/rest/metrics/traffic#get-top-referral-paths
     */
    "GET /repos/{owner}/{repo}/traffic/popular/paths": Operation<"/repos/{owner}/{repo}/traffic/popular/paths", "get">;
    /**
     * @see https://docs.github.com/rest/metrics/traffic#get-top-referral-sources
     */
    "GET /repos/{owner}/{repo}/traffic/popular/referrers": Operation<"/repos/{owner}/{repo}/traffic/popular/referrers", "get">;
    /**
     * @see https://docs.github.com/rest/metrics/traffic#get-page-views
     */
    "GET /repos/{owner}/{repo}/traffic/views": Operation<"/repos/{owner}/{repo}/traffic/views", "get">;
    /**
     * @see https://docs.github.com/rest/repos/repos#check-if-vulnerability-alerts-are-enabled-for-a-repository
     */
    "GET /repos/{owner}/{repo}/vulnerability-alerts": Operation<"/repos/{owner}/{repo}/vulnerability-alerts", "get">;
    /**
     * @see https://docs.github.com/rest/repos/contents#download-a-repository-archive-zip
     */
    "GET /repos/{owner}/{repo}/zipball/{ref}": Operation<"/repos/{owner}/{repo}/zipball/{ref}", "get">;
    /**
     * @see https://docs.github.com/rest/repos/repos#list-public-repositories
     */
    "GET /repositories": Operation<"/repositories", "get">;
    /**
     * @see https://docs.github.com/rest/search/search#search-code
     */
    "GET /search/code": Operation<"/search/code", "get">;
    /**
     * @see https://docs.github.com/rest/search/search#search-commits
     */
    "GET /search/commits": Operation<"/search/commits", "get">;
    /**
     * @see https://docs.github.com/rest/search/search#search-issues-and-pull-requests
     */
    "GET /search/issues": Operation<"/search/issues", "get">;
    /**
     * @see https://docs.github.com/rest/search/search#search-labels
     */
    "GET /search/labels": Operation<"/search/labels", "get">;
    /**
     * @see https://docs.github.com/rest/search/search#search-repositories
     */
    "GET /search/repositories": Operation<"/search/repositories", "get">;
    /**
     * @see https://docs.github.com/rest/search/search#search-topics
     */
    "GET /search/topics": Operation<"/search/topics", "get">;
    /**
     * @see https://docs.github.com/rest/search/search#search-users
     */
    "GET /search/users": Operation<"/search/users", "get">;
    /**
     * @see https://docs.github.com/rest/teams/teams#get-a-team-legacy
     */
    "GET /teams/{team_id}": Operation<"/teams/{team_id}", "get">;
    /**
     * @see https://docs.github.com/rest/teams/discussions#list-discussions-legacy
     */
    "GET /teams/{team_id}/discussions": Operation<"/teams/{team_id}/discussions", "get">;
    /**
     * @see https://docs.github.com/rest/teams/discussions#get-a-discussion-legacy
     */
    "GET /teams/{team_id}/discussions/{discussion_number}": Operation<"/teams/{team_id}/discussions/{discussion_number}", "get">;
    /**
     * @see https://docs.github.com/rest/teams/discussion-comments#list-discussion-comments-legacy
     */
    "GET /teams/{team_id}/discussions/{discussion_number}/comments": Operation<"/teams/{team_id}/discussions/{discussion_number}/comments", "get">;
    /**
     * @see https://docs.github.com/rest/teams/discussion-comments#get-a-discussion-comment-legacy
     */
    "GET /teams/{team_id}/discussions/{discussion_number}/comments/{comment_number}": Operation<"/teams/{team_id}/discussions/{discussion_number}/comments/{comment_number}", "get">;
    /**
     * @see https://docs.github.com/rest/reactions/reactions#list-reactions-for-a-team-discussion-comment-legacy
     */
    "GET /teams/{team_id}/discussions/{discussion_number}/comments/{comment_number}/reactions": Operation<"/teams/{team_id}/discussions/{discussion_number}/comments/{comment_number}/reactions", "get">;
    /**
     * @see https://docs.github.com/rest/reactions/reactions#list-reactions-for-a-team-discussion-legacy
     */
    "GET /teams/{team_id}/discussions/{discussion_number}/reactions": Operation<"/teams/{team_id}/discussions/{discussion_number}/reactions", "get">;
    /**
     * @see https://docs.github.com/rest/teams/members#list-pending-team-invitations-legacy
     */
    "GET /teams/{team_id}/invitations": Operation<"/teams/{team_id}/invitations", "get">;
    /**
     * @see https://docs.github.com/rest/teams/members#list-team-members-legacy
     */
    "GET /teams/{team_id}/members": Operation<"/teams/{team_id}/members", "get">;
    /**
     * @see https://docs.github.com/rest/teams/members#get-team-member-legacy
     */
    "GET /teams/{team_id}/members/{username}": Operation<"/teams/{team_id}/members/{username}", "get">;
    /**
     * @see https://docs.github.com/rest/teams/members#get-team-membership-for-a-user-legacy
     */
    "GET /teams/{team_id}/memberships/{username}": Operation<"/teams/{team_id}/memberships/{username}", "get">;
    /**
     * @see https://docs.github.com/rest/teams/teams#list-team-projects-legacy
     */
    "GET /teams/{team_id}/projects": Operation<"/teams/{team_id}/projects", "get">;
    /**
     * @see https://docs.github.com/rest/teams/teams#check-team-permissions-for-a-project-legacy
     */
    "GET /teams/{team_id}/projects/{project_id}": Operation<"/teams/{team_id}/projects/{project_id}", "get">;
    /**
     * @see https://docs.github.com/rest/teams/teams#list-team-repositories-legacy
     */
    "GET /teams/{team_id}/repos": Operation<"/teams/{team_id}/repos", "get">;
    /**
     * @see https://docs.github.com/rest/teams/teams#check-team-permissions-for-a-repository-legacy
     */
    "GET /teams/{team_id}/repos/{owner}/{repo}": Operation<"/teams/{team_id}/repos/{owner}/{repo}", "get">;
    /**
     * @see https://docs.github.com/rest/teams/teams#list-child-teams-legacy
     */
    "GET /teams/{team_id}/teams": Operation<"/teams/{team_id}/teams", "get">;
    /**
     * @see https://docs.github.com/rest/users/users#get-the-authenticated-user
     */
    "GET /user": Operation<"/user", "get">;
    /**
     * @see https://docs.github.com/rest/users/blocking#list-users-blocked-by-the-authenticated-user
     */
    "GET /user/blocks": Operation<"/user/blocks", "get">;
    /**
     * @see https://docs.github.com/rest/users/blocking#check-if-a-user-is-blocked-by-the-authenticated-user
     */
    "GET /user/blocks/{username}": Operation<"/user/blocks/{username}", "get">;
    /**
     * @see https://docs.github.com/rest/codespaces/codespaces#list-codespaces-for-the-authenticated-user
     */
    "GET /user/codespaces": Operation<"/user/codespaces", "get">;
    /**
     * @see https://docs.github.com/rest/codespaces/secrets#list-secrets-for-the-authenticated-user
     */
    "GET /user/codespaces/secrets": Operation<"/user/codespaces/secrets", "get">;
    /**
     * @see https://docs.github.com/rest/codespaces/secrets#get-public-key-for-the-authenticated-user
     */
    "GET /user/codespaces/secrets/public-key": Operation<"/user/codespaces/secrets/public-key", "get">;
    /**
     * @see https://docs.github.com/rest/codespaces/secrets#get-a-secret-for-the-authenticated-user
     */
    "GET /user/codespaces/secrets/{secret_name}": Operation<"/user/codespaces/secrets/{secret_name}", "get">;
    /**
     * @see https://docs.github.com/rest/codespaces/secrets#list-selected-repositories-for-a-user-secret
     */
    "GET /user/codespaces/secrets/{secret_name}/repositories": Operation<"/user/codespaces/secrets/{secret_name}/repositories", "get">;
    /**
     * @see https://docs.github.com/rest/codespaces/codespaces#get-a-codespace-for-the-authenticated-user
     */
    "GET /user/codespaces/{codespace_name}": Operation<"/user/codespaces/{codespace_name}", "get">;
    /**
     * @see https://docs.github.com/rest/codespaces/codespaces#get-details-about-a-codespace-export
     */
    "GET /user/codespaces/{codespace_name}/exports/{export_id}": Operation<"/user/codespaces/{codespace_name}/exports/{export_id}", "get">;
    /**
     * @see https://docs.github.com/rest/codespaces/machines#list-machine-types-for-a-codespace
     */
    "GET /user/codespaces/{codespace_name}/machines": Operation<"/user/codespaces/{codespace_name}/machines", "get">;
    /**
     * @see https://docs.github.com/rest/packages/packages#get-list-of-conflicting-packages-during-docker-migration-for-authenticated-user
     */
    "GET /user/docker/conflicts": Operation<"/user/docker/conflicts", "get">;
    /**
     * @see https://docs.github.com/rest/users/emails#list-email-addresses-for-the-authenticated-user
     */
    "GET /user/emails": Operation<"/user/emails", "get">;
    /**
     * @see https://docs.github.com/rest/users/followers#list-followers-of-the-authenticated-user
     */
    "GET /user/followers": Operation<"/user/followers", "get">;
    /**
     * @see https://docs.github.com/rest/users/followers#list-the-people-the-authenticated-user-follows
     */
    "GET /user/following": Operation<"/user/following", "get">;
    /**
     * @see https://docs.github.com/rest/users/followers#check-if-a-person-is-followed-by-the-authenticated-user
     */
    "GET /user/following/{username}": Operation<"/user/following/{username}", "get">;
    /**
     * @see https://docs.github.com/rest/users/gpg-keys#list-gpg-keys-for-the-authenticated-user
     */
    "GET /user/gpg_keys": Operation<"/user/gpg_keys", "get">;
    /**
     * @see https://docs.github.com/rest/users/gpg-keys#get-a-gpg-key-for-the-authenticated-user
     */
    "GET /user/gpg_keys/{gpg_key_id}": Operation<"/user/gpg_keys/{gpg_key_id}", "get">;
    /**
     * @see https://docs.github.com/rest/apps/installations#list-app-installations-accessible-to-the-user-access-token
     */
    "GET /user/installations": Operation<"/user/installations", "get">;
    /**
     * @see https://docs.github.com/rest/apps/installations#list-repositories-accessible-to-the-user-access-token
     */
    "GET /user/installations/{installation_id}/repositories": Operation<"/user/installations/{installation_id}/repositories", "get">;
    /**
     * @see https://docs.github.com/rest/interactions/user#get-interaction-restrictions-for-your-public-repositories
     */
    "GET /user/interaction-limits": Operation<"/user/interaction-limits", "get">;
    /**
     * @see https://docs.github.com/rest/issues/issues#list-user-account-issues-assigned-to-the-authenticated-user
     */
    "GET /user/issues": Operation<"/user/issues", "get">;
    /**
     * @see https://docs.github.com/rest/users/keys#list-public-ssh-keys-for-the-authenticated-user
     */
    "GET /user/keys": Operation<"/user/keys", "get">;
    /**
     * @see https://docs.github.com/rest/users/keys#get-a-public-ssh-key-for-the-authenticated-user
     */
    "GET /user/keys/{key_id}": Operation<"/user/keys/{key_id}", "get">;
    /**
     * @see https://docs.github.com/rest/apps/marketplace#list-subscriptions-for-the-authenticated-user
     */
    "GET /user/marketplace_purchases": Operation<"/user/marketplace_purchases", "get">;
    /**
     * @see https://docs.github.com/rest/apps/marketplace#list-subscriptions-for-the-authenticated-user-stubbed
     */
    "GET /user/marketplace_purchases/stubbed": Operation<"/user/marketplace_purchases/stubbed", "get">;
    /**
     * @see https://docs.github.com/rest/orgs/members#list-organization-memberships-for-the-authenticated-user
     */
    "GET /user/memberships/orgs": Operation<"/user/memberships/orgs", "get">;
    /**
     * @see https://docs.github.com/rest/orgs/members#get-an-organization-membership-for-the-authenticated-user
     */
    "GET /user/memberships/orgs/{org}": Operation<"/user/memberships/orgs/{org}", "get">;
    /**
     * @see https://docs.github.com/rest/migrations/users#list-user-migrations
     */
    "GET /user/migrations": Operation<"/user/migrations", "get">;
    /**
     * @see https://docs.github.com/rest/migrations/users#get-a-user-migration-status
     */
    "GET /user/migrations/{migration_id}": Operation<"/user/migrations/{migration_id}", "get">;
    /**
     * @see https://docs.github.com/rest/migrations/users#download-a-user-migration-archive
     */
    "GET /user/migrations/{migration_id}/archive": Operation<"/user/migrations/{migration_id}/archive", "get">;
    /**
     * @see https://docs.github.com/rest/migrations/users#list-repositories-for-a-user-migration
     */
    "GET /user/migrations/{migration_id}/repositories": Operation<"/user/migrations/{migration_id}/repositories", "get">;
    /**
     * @see https://docs.github.com/rest/orgs/orgs#list-organizations-for-the-authenticated-user
     */
    "GET /user/orgs": Operation<"/user/orgs", "get">;
    /**
     * @see https://docs.github.com/rest/packages/packages#list-packages-for-the-authenticated-users-namespace
     */
    "GET /user/packages": Operation<"/user/packages", "get">;
    /**
     * @see https://docs.github.com/rest/packages/packages#get-a-package-for-the-authenticated-user
     */
    "GET /user/packages/{package_type}/{package_name}": Operation<"/user/packages/{package_type}/{package_name}", "get">;
    /**
     * @see https://docs.github.com/rest/packages/packages#list-package-versions-for-a-package-owned-by-the-authenticated-user
     */
    "GET /user/packages/{package_type}/{package_name}/versions": Operation<"/user/packages/{package_type}/{package_name}/versions", "get">;
    /**
     * @see https://docs.github.com/rest/packages/packages#get-a-package-version-for-the-authenticated-user
     */
    "GET /user/packages/{package_type}/{package_name}/versions/{package_version_id}": Operation<"/user/packages/{package_type}/{package_name}/versions/{package_version_id}", "get">;
    /**
     * @see https://docs.github.com/rest/users/emails#list-public-email-addresses-for-the-authenticated-user
     */
    "GET /user/public_emails": Operation<"/user/public_emails", "get">;
    /**
     * @see https://docs.github.com/rest/repos/repos#list-repositories-for-the-authenticated-user
     */
    "GET /user/repos": Operation<"/user/repos", "get">;
    /**
     * @see https://docs.github.com/rest/collaborators/invitations#list-repository-invitations-for-the-authenticated-user
     */
    "GET /user/repository_invitations": Operation<"/user/repository_invitations", "get">;
    /**
     * @see https://docs.github.com/rest/users/social-accounts#list-social-accounts-for-the-authenticated-user
     */
    "GET /user/social_accounts": Operation<"/user/social_accounts", "get">;
    /**
     * @see https://docs.github.com/rest/users/ssh-signing-keys#list-ssh-signing-keys-for-the-authenticated-user
     */
    "GET /user/ssh_signing_keys": Operation<"/user/ssh_signing_keys", "get">;
    /**
     * @see https://docs.github.com/rest/users/ssh-signing-keys#get-an-ssh-signing-key-for-the-authenticated-user
     */
    "GET /user/ssh_signing_keys/{ssh_signing_key_id}": Operation<"/user/ssh_signing_keys/{ssh_signing_key_id}", "get">;
    /**
     * @see https://docs.github.com/rest/activity/starring#list-repositories-starred-by-the-authenticated-user
     */
    "GET /user/starred": Operation<"/user/starred", "get">;
    /**
     * @see https://docs.github.com/rest/activity/starring#check-if-a-repository-is-starred-by-the-authenticated-user
     */
    "GET /user/starred/{owner}/{repo}": Operation<"/user/starred/{owner}/{repo}", "get">;
    /**
     * @see https://docs.github.com/rest/activity/watching#list-repositories-watched-by-the-authenticated-user
     */
    "GET /user/subscriptions": Operation<"/user/subscriptions", "get">;
    /**
     * @see https://docs.github.com/rest/teams/teams#list-teams-for-the-authenticated-user
     */
    "GET /user/teams": Operation<"/user/teams", "get">;
    /**
     * @see https://docs.github.com/rest/users/users#get-a-user-using-their-id
     */
    "GET /user/{account_id}": Operation<"/user/{account_id}", "get">;
    /**
     * @see https://docs.github.com/rest/users/users#list-users
     */
    "GET /users": Operation<"/users", "get">;
    /**
     * @see https://docs.github.com/rest/users/users#get-a-user
     */
    "GET /users/{username}": Operation<"/users/{username}", "get">;
    /**
     * @see https://docs.github.com/rest/users/attestations#list-attestations
     */
    "GET /users/{username}/attestations/{subject_digest}": Operation<"/users/{username}/attestations/{subject_digest}", "get">;
    /**
     * @see https://docs.github.com/rest/packages/packages#get-list-of-conflicting-packages-during-docker-migration-for-user
     */
    "GET /users/{username}/docker/conflicts": Operation<"/users/{username}/docker/conflicts", "get">;
    /**
     * @see https://docs.github.com/rest/activity/events#list-events-for-the-authenticated-user
     */
    "GET /users/{username}/events": Operation<"/users/{username}/events", "get">;
    /**
     * @see https://docs.github.com/rest/activity/events#list-organization-events-for-the-authenticated-user
     */
    "GET /users/{username}/events/orgs/{org}": Operation<"/users/{username}/events/orgs/{org}", "get">;
    /**
     * @see https://docs.github.com/rest/activity/events#list-public-events-for-a-user
     */
    "GET /users/{username}/events/public": Operation<"/users/{username}/events/public", "get">;
    /**
     * @see https://docs.github.com/rest/users/followers#list-followers-of-a-user
     */
    "GET /users/{username}/followers": Operation<"/users/{username}/followers", "get">;
    /**
     * @see https://docs.github.com/rest/users/followers#list-the-people-a-user-follows
     */
    "GET /users/{username}/following": Operation<"/users/{username}/following", "get">;
    /**
     * @see https://docs.github.com/rest/users/followers#check-if-a-user-follows-another-user
     */
    "GET /users/{username}/following/{target_user}": Operation<"/users/{username}/following/{target_user}", "get">;
    /**
     * @see https://docs.github.com/rest/gists/gists#list-gists-for-a-user
     */
    "GET /users/{username}/gists": Operation<"/users/{username}/gists", "get">;
    /**
     * @see https://docs.github.com/rest/users/gpg-keys#list-gpg-keys-for-a-user
     */
    "GET /users/{username}/gpg_keys": Operation<"/users/{username}/gpg_keys", "get">;
    /**
     * @see https://docs.github.com/rest/users/users#get-contextual-information-for-a-user
     */
    "GET /users/{username}/hovercard": Operation<"/users/{username}/hovercard", "get">;
    /**
     * @see https://docs.github.com/rest/apps/apps#get-a-user-installation-for-the-authenticated-app
     */
    "GET /users/{username}/installation": Operation<"/users/{username}/installation", "get">;
    /**
     * @see https://docs.github.com/rest/users/keys#list-public-keys-for-a-user
     */
    "GET /users/{username}/keys": Operation<"/users/{username}/keys", "get">;
    /**
     * @see https://docs.github.com/rest/orgs/orgs#list-organizations-for-a-user
     */
    "GET /users/{username}/orgs": Operation<"/users/{username}/orgs", "get">;
    /**
     * @see https://docs.github.com/rest/packages/packages#list-packages-for-a-user
     */
    "GET /users/{username}/packages": Operation<"/users/{username}/packages", "get">;
    /**
     * @see https://docs.github.com/rest/packages/packages#get-a-package-for-a-user
     */
    "GET /users/{username}/packages/{package_type}/{package_name}": Operation<"/users/{username}/packages/{package_type}/{package_name}", "get">;
    /**
     * @see https://docs.github.com/rest/packages/packages#list-package-versions-for-a-package-owned-by-a-user
     */
    "GET /users/{username}/packages/{package_type}/{package_name}/versions": Operation<"/users/{username}/packages/{package_type}/{package_name}/versions", "get">;
    /**
     * @see https://docs.github.com/rest/packages/packages#get-a-package-version-for-a-user
     */
    "GET /users/{username}/packages/{package_type}/{package_name}/versions/{package_version_id}": Operation<"/users/{username}/packages/{package_type}/{package_name}/versions/{package_version_id}", "get">;
    /**
     * @see https://docs.github.com/rest/projects/projects#list-user-projects
     */
    "GET /users/{username}/projects": Operation<"/users/{username}/projects", "get">;
    /**
     * @see https://docs.github.com/rest/activity/events#list-events-received-by-the-authenticated-user
     */
    "GET /users/{username}/received_events": Operation<"/users/{username}/received_events", "get">;
    /**
     * @see https://docs.github.com/rest/activity/events#list-public-events-received-by-a-user
     */
    "GET /users/{username}/received_events/public": Operation<"/users/{username}/received_events/public", "get">;
    /**
     * @see https://docs.github.com/rest/repos/repos#list-repositories-for-a-user
     */
    "GET /users/{username}/repos": Operation<"/users/{username}/repos", "get">;
    /**
     * @see https://docs.github.com/rest/billing/billing#get-github-actions-billing-for-a-user
     */
    "GET /users/{username}/settings/billing/actions": Operation<"/users/{username}/settings/billing/actions", "get">;
    /**
     * @see https://docs.github.com/rest/billing/billing#get-github-packages-billing-for-a-user
     */
    "GET /users/{username}/settings/billing/packages": Operation<"/users/{username}/settings/billing/packages", "get">;
    /**
     * @see https://docs.github.com/rest/billing/billing#get-shared-storage-billing-for-a-user
     */
    "GET /users/{username}/settings/billing/shared-storage": Operation<"/users/{username}/settings/billing/shared-storage", "get">;
    /**
     * @see https://docs.github.com/rest/users/social-accounts#list-social-accounts-for-a-user
     */
    "GET /users/{username}/social_accounts": Operation<"/users/{username}/social_accounts", "get">;
    /**
     * @see https://docs.github.com/rest/users/ssh-signing-keys#list-ssh-signing-keys-for-a-user
     */
    "GET /users/{username}/ssh_signing_keys": Operation<"/users/{username}/ssh_signing_keys", "get">;
    /**
     * @see https://docs.github.com/rest/activity/starring#list-repositories-starred-by-a-user
     */
    "GET /users/{username}/starred": Operation<"/users/{username}/starred", "get">;
    /**
     * @see https://docs.github.com/rest/activity/watching#list-repositories-watched-by-a-user
     */
    "GET /users/{username}/subscriptions": Operation<"/users/{username}/subscriptions", "get">;
    /**
     * @see https://docs.github.com/rest/meta/meta#get-all-api-versions
     */
    "GET /versions": Operation<"/versions", "get">;
    /**
     * @see https://docs.github.com/rest/meta/meta#get-the-zen-of-github
     */
    "GET /zen": Operation<"/zen", "get">;
    /**
     * @see https://docs.github.com/rest/apps/webhooks#update-a-webhook-configuration-for-an-app
     */
    "PATCH /app/hook/config": Operation<"/app/hook/config", "patch">;
    /**
     * @see https://docs.github.com/rest/apps/oauth-applications#reset-a-token
     */
    "PATCH /applications/{client_id}/token": Operation<"/applications/{client_id}/token", "patch">;
    /**
     * @see https://docs.github.com/rest/code-security/configurations#update-a-custom-code-security-configuration-for-an-enterprise
     */
    "PATCH /enterprises/{enterprise}/code-security/configurations/{configuration_id}": Operation<"/enterprises/{enterprise}/code-security/configurations/{configuration_id}", "patch">;
    /**
     * @see https://docs.github.com/rest/reference/gists/#update-a-gist
     */
    "PATCH /gists/{gist_id}": Operation<"/gists/{gist_id}", "patch">;
    /**
     * @see https://docs.github.com/rest/gists/comments#update-a-gist-comment
     */
    "PATCH /gists/{gist_id}/comments/{comment_id}": Operation<"/gists/{gist_id}/comments/{comment_id}", "patch">;
    /**
     * @see https://docs.github.com/rest/activity/notifications#mark-a-thread-as-read
     */
    "PATCH /notifications/threads/{thread_id}": Operation<"/notifications/threads/{thread_id}", "patch">;
    /**
     * @see https://docs.github.com/rest/orgs/orgs#update-an-organization
     */
    "PATCH /orgs/{org}": Operation<"/orgs/{org}", "patch">;
    /**
     * @see https://docs.github.com/rest/actions/hosted-runners#update-a-github-hosted-runner-for-an-organization
     */
    "PATCH /orgs/{org}/actions/hosted-runners/{hosted_runner_id}": Operation<"/orgs/{org}/actions/hosted-runners/{hosted_runner_id}", "patch">;
    /**
     * @see https://docs.github.com/rest/actions/self-hosted-runner-groups#update-a-self-hosted-runner-group-for-an-organization
     */
    "PATCH /orgs/{org}/actions/runner-groups/{runner_group_id}": Operation<"/orgs/{org}/actions/runner-groups/{runner_group_id}", "patch">;
    /**
     * @see https://docs.github.com/rest/actions/variables#update-an-organization-variable
     */
    "PATCH /orgs/{org}/actions/variables/{name}": Operation<"/orgs/{org}/actions/variables/{name}", "patch">;
    /**
     * @see https://docs.github.com/rest/code-security/configurations#update-a-code-security-configuration
     */
    "PATCH /orgs/{org}/code-security/configurations/{configuration_id}": Operation<"/orgs/{org}/code-security/configurations/{configuration_id}", "patch">;
    /**
     * @see https://docs.github.com/rest/orgs/webhooks#update-an-organization-webhook
     */
    "PATCH /orgs/{org}/hooks/{hook_id}": Operation<"/orgs/{org}/hooks/{hook_id}", "patch">;
    /**
     * @see https://docs.github.com/rest/orgs/webhooks#update-a-webhook-configuration-for-an-organization
     */
    "PATCH /orgs/{org}/hooks/{hook_id}/config": Operation<"/orgs/{org}/hooks/{hook_id}/config", "patch">;
    /**
     * @see https://docs.github.com/rest/private-registries/organization-configurations#update-a-private-registry-for-an-organization
     */
    "PATCH /orgs/{org}/private-registries/{secret_name}": Operation<"/orgs/{org}/private-registries/{secret_name}", "patch">;
    /**
     * @see https://docs.github.com/rest/orgs/custom-properties#create-or-update-custom-properties-for-an-organization
     */
    "PATCH /orgs/{org}/properties/schema": Operation<"/orgs/{org}/properties/schema", "patch">;
    /**
     * @see https://docs.github.com/rest/orgs/custom-properties#create-or-update-custom-property-values-for-organization-repositories
     */
    "PATCH /orgs/{org}/properties/values": Operation<"/orgs/{org}/properties/values", "patch">;
    /**
     * @see https://docs.github.com/rest/orgs/network-configurations#update-a-hosted-compute-network-configuration-for-an-organization
     */
    "PATCH /orgs/{org}/settings/network-configurations/{network_configuration_id}": Operation<"/orgs/{org}/settings/network-configurations/{network_configuration_id}", "patch">;
    /**
     * @see https://docs.github.com/rest/teams/teams#update-a-team
     */
    "PATCH /orgs/{org}/teams/{team_slug}": Operation<"/orgs/{org}/teams/{team_slug}", "patch">;
    /**
     * @see https://docs.github.com/rest/teams/discussions#update-a-discussion
     */
    "PATCH /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}": Operation<"/orgs/{org}/teams/{team_slug}/discussions/{discussion_number}", "patch">;
    /**
     * @see https://docs.github.com/rest/teams/discussion-comments#update-a-discussion-comment
     */
    "PATCH /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments/{comment_number}": Operation<"/orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments/{comment_number}", "patch">;
    /**
     * @see https://docs.github.com/rest/projects/cards#update-an-existing-project-card
     */
    "PATCH /projects/columns/cards/{card_id}": Operation<"/projects/columns/cards/{card_id}", "patch">;
    /**
     * @see https://docs.github.com/rest/projects/columns#update-an-existing-project-column
     */
    "PATCH /projects/columns/{column_id}": Operation<"/projects/columns/{column_id}", "patch">;
    /**
     * @see https://docs.github.com/rest/projects/projects#update-a-project
     */
    "PATCH /projects/{project_id}": Operation<"/projects/{project_id}", "patch">;
    /**
     * @see https://docs.github.com/rest/repos/repos#update-a-repository
     */
    "PATCH /repos/{owner}/{repo}": Operation<"/repos/{owner}/{repo}", "patch">;
    /**
     * @see https://docs.github.com/rest/actions/variables#update-a-repository-variable
     */
    "PATCH /repos/{owner}/{repo}/actions/variables/{name}": Operation<"/repos/{owner}/{repo}/actions/variables/{name}", "patch">;
    /**
     * @see https://docs.github.com/rest/branches/branch-protection#update-pull-request-review-protection
     */
    "PATCH /repos/{owner}/{repo}/branches/{branch}/protection/required_pull_request_reviews": Operation<"/repos/{owner}/{repo}/branches/{branch}/protection/required_pull_request_reviews", "patch">;
    /**
     * @see https://docs.github.com/rest/branches/branch-protection#update-status-check-protection
     */
    "PATCH /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks": Operation<"/repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks", "patch">;
    /**
     * @see https://docs.github.com/rest/checks/runs#update-a-check-run
     */
    "PATCH /repos/{owner}/{repo}/check-runs/{check_run_id}": Operation<"/repos/{owner}/{repo}/check-runs/{check_run_id}", "patch">;
    /**
     * @see https://docs.github.com/rest/checks/suites#update-repository-preferences-for-check-suites
     */
    "PATCH /repos/{owner}/{repo}/check-suites/preferences": Operation<"/repos/{owner}/{repo}/check-suites/preferences", "patch">;
    /**
     * @see https://docs.github.com/rest/code-scanning/code-scanning#update-a-code-scanning-alert
     */
    "PATCH /repos/{owner}/{repo}/code-scanning/alerts/{alert_number}": Operation<"/repos/{owner}/{repo}/code-scanning/alerts/{alert_number}", "patch">;
    /**
     * @see https://docs.github.com/rest/code-scanning/code-scanning#update-a-code-scanning-default-setup-configuration
     */
    "PATCH /repos/{owner}/{repo}/code-scanning/default-setup": Operation<"/repos/{owner}/{repo}/code-scanning/default-setup", "patch">;
    /**
     * @see https://docs.github.com/rest/commits/comments#update-a-commit-comment
     */
    "PATCH /repos/{owner}/{repo}/comments/{comment_id}": Operation<"/repos/{owner}/{repo}/comments/{comment_id}", "patch">;
    /**
     * @see https://docs.github.com/rest/dependabot/alerts#update-a-dependabot-alert
     */
    "PATCH /repos/{owner}/{repo}/dependabot/alerts/{alert_number}": Operation<"/repos/{owner}/{repo}/dependabot/alerts/{alert_number}", "patch">;
    /**
     * @see https://docs.github.com/rest/actions/variables#update-an-environment-variable
     */
    "PATCH /repos/{owner}/{repo}/environments/{environment_name}/variables/{name}": Operation<"/repos/{owner}/{repo}/environments/{environment_name}/variables/{name}", "patch">;
    /**
     * @see https://docs.github.com/rest/git/refs#update-a-reference
     */
    "PATCH /repos/{owner}/{repo}/git/refs/{ref}": Operation<"/repos/{owner}/{repo}/git/refs/{ref}", "patch">;
    /**
     * @see https://docs.github.com/rest/repos/webhooks#update-a-repository-webhook
     */
    "PATCH /repos/{owner}/{repo}/hooks/{hook_id}": Operation<"/repos/{owner}/{repo}/hooks/{hook_id}", "patch">;
    /**
     * @see https://docs.github.com/rest/repos/webhooks#update-a-webhook-configuration-for-a-repository
     */
    "PATCH /repos/{owner}/{repo}/hooks/{hook_id}/config": Operation<"/repos/{owner}/{repo}/hooks/{hook_id}/config", "patch">;
    /**
     * @see https://docs.github.com/rest/migrations/source-imports#update-an-import
     */
    "PATCH /repos/{owner}/{repo}/import": Operation<"/repos/{owner}/{repo}/import", "patch">;
    /**
     * @see https://docs.github.com/rest/migrations/source-imports#map-a-commit-author
     */
    "PATCH /repos/{owner}/{repo}/import/authors/{author_id}": Operation<"/repos/{owner}/{repo}/import/authors/{author_id}", "patch">;
    /**
     * @see https://docs.github.com/rest/migrations/source-imports#update-git-lfs-preference
     */
    "PATCH /repos/{owner}/{repo}/import/lfs": Operation<"/repos/{owner}/{repo}/import/lfs", "patch">;
    /**
     * @see https://docs.github.com/rest/collaborators/invitations#update-a-repository-invitation
     */
    "PATCH /repos/{owner}/{repo}/invitations/{invitation_id}": Operation<"/repos/{owner}/{repo}/invitations/{invitation_id}", "patch">;
    /**
     * @see https://docs.github.com/rest/issues/comments#update-an-issue-comment
     */
    "PATCH /repos/{owner}/{repo}/issues/comments/{comment_id}": Operation<"/repos/{owner}/{repo}/issues/comments/{comment_id}", "patch">;
    /**
     * @see https://docs.github.com/rest/issues/issues#update-an-issue
     */
    "PATCH /repos/{owner}/{repo}/issues/{issue_number}": Operation<"/repos/{owner}/{repo}/issues/{issue_number}", "patch">;
    /**
     * @see https://docs.github.com/rest/issues/sub-issues#reprioritize-sub-issue
     */
    "PATCH /repos/{owner}/{repo}/issues/{issue_number}/sub_issues/priority": Operation<"/repos/{owner}/{repo}/issues/{issue_number}/sub_issues/priority", "patch">;
    /**
     * @see https://docs.github.com/rest/issues/labels#update-a-label
     */
    "PATCH /repos/{owner}/{repo}/labels/{name}": Operation<"/repos/{owner}/{repo}/labels/{name}", "patch">;
    /**
     * @see https://docs.github.com/rest/issues/milestones#update-a-milestone
     */
    "PATCH /repos/{owner}/{repo}/milestones/{milestone_number}": Operation<"/repos/{owner}/{repo}/milestones/{milestone_number}", "patch">;
    /**
     * @see https://docs.github.com/rest/repos/custom-properties#create-or-update-custom-property-values-for-a-repository
     */
    "PATCH /repos/{owner}/{repo}/properties/values": Operation<"/repos/{owner}/{repo}/properties/values", "patch">;
    /**
     * @see https://docs.github.com/rest/pulls/comments#update-a-review-comment-for-a-pull-request
     */
    "PATCH /repos/{owner}/{repo}/pulls/comments/{comment_id}": Operation<"/repos/{owner}/{repo}/pulls/comments/{comment_id}", "patch">;
    /**
     * @see https://docs.github.com/rest/pulls/pulls#update-a-pull-request
     */
    "PATCH /repos/{owner}/{repo}/pulls/{pull_number}": Operation<"/repos/{owner}/{repo}/pulls/{pull_number}", "patch">;
    /**
     * @see https://docs.github.com/rest/releases/assets#update-a-release-asset
     */
    "PATCH /repos/{owner}/{repo}/releases/assets/{asset_id}": Operation<"/repos/{owner}/{repo}/releases/assets/{asset_id}", "patch">;
    /**
     * @see https://docs.github.com/rest/releases/releases#update-a-release
     */
    "PATCH /repos/{owner}/{repo}/releases/{release_id}": Operation<"/repos/{owner}/{repo}/releases/{release_id}", "patch">;
    /**
     * @see https://docs.github.com/rest/secret-scanning/secret-scanning#update-a-secret-scanning-alert
     */
    "PATCH /repos/{owner}/{repo}/secret-scanning/alerts/{alert_number}": Operation<"/repos/{owner}/{repo}/secret-scanning/alerts/{alert_number}", "patch">;
    /**
     * @see https://docs.github.com/rest/security-advisories/repository-advisories#update-a-repository-security-advisory
     */
    "PATCH /repos/{owner}/{repo}/security-advisories/{ghsa_id}": Operation<"/repos/{owner}/{repo}/security-advisories/{ghsa_id}", "patch">;
    /**
     * @see https://docs.github.com/rest/teams/teams#update-a-team-legacy
     */
    "PATCH /teams/{team_id}": Operation<"/teams/{team_id}", "patch">;
    /**
     * @see https://docs.github.com/rest/teams/discussions#update-a-discussion-legacy
     */
    "PATCH /teams/{team_id}/discussions/{discussion_number}": Operation<"/teams/{team_id}/discussions/{discussion_number}", "patch">;
    /**
     * @see https://docs.github.com/rest/teams/discussion-comments#update-a-discussion-comment-legacy
     */
    "PATCH /teams/{team_id}/discussions/{discussion_number}/comments/{comment_number}": Operation<"/teams/{team_id}/discussions/{discussion_number}/comments/{comment_number}", "patch">;
    /**
     * @see https://docs.github.com/rest/users/users#update-the-authenticated-user
     */
    "PATCH /user": Operation<"/user", "patch">;
    /**
     * @see https://docs.github.com/rest/codespaces/codespaces#update-a-codespace-for-the-authenticated-user
     */
    "PATCH /user/codespaces/{codespace_name}": Operation<"/user/codespaces/{codespace_name}", "patch">;
    /**
     * @see https://docs.github.com/rest/users/emails#set-primary-email-visibility-for-the-authenticated-user
     */
    "PATCH /user/email/visibility": Operation<"/user/email/visibility", "patch">;
    /**
     * @see https://docs.github.com/rest/orgs/members#update-an-organization-membership-for-the-authenticated-user
     */
    "PATCH /user/memberships/orgs/{org}": Operation<"/user/memberships/orgs/{org}", "patch">;
    /**
     * @see https://docs.github.com/rest/collaborators/invitations#accept-a-repository-invitation
     */
    "PATCH /user/repository_invitations/{invitation_id}": Operation<"/user/repository_invitations/{invitation_id}", "patch">;
    /**
     * @see https://docs.github.com/rest/apps/apps#create-a-github-app-from-a-manifest
     */
    "POST /app-manifests/{code}/conversions": Operation<"/app-manifests/{code}/conversions", "post">;
    /**
     * @see https://docs.github.com/rest/apps/webhooks#redeliver-a-delivery-for-an-app-webhook
     */
    "POST /app/hook/deliveries/{delivery_id}/attempts": Operation<"/app/hook/deliveries/{delivery_id}/attempts", "post">;
    /**
     * @see https://docs.github.com/rest/apps/apps#create-an-installation-access-token-for-an-app
     */
    "POST /app/installations/{installation_id}/access_tokens": Operation<"/app/installations/{installation_id}/access_tokens", "post">;
    /**
     * @see https://docs.github.com/rest/apps/oauth-applications#check-a-token
     */
    "POST /applications/{client_id}/token": Operation<"/applications/{client_id}/token", "post">;
    /**
     * @see https://docs.github.com/rest/apps/apps#create-a-scoped-access-token
     */
    "POST /applications/{client_id}/token/scoped": Operation<"/applications/{client_id}/token/scoped", "post">;
    /**
     * @see https://docs.github.com/rest/code-security/configurations#create-a-code-security-configuration-for-an-enterprise
     */
    "POST /enterprises/{enterprise}/code-security/configurations": Operation<"/enterprises/{enterprise}/code-security/configurations", "post">;
    /**
     * @see https://docs.github.com/rest/code-security/configurations#attach-an-enterprise-configuration-to-repositories
     */
    "POST /enterprises/{enterprise}/code-security/configurations/{configuration_id}/attach": Operation<"/enterprises/{enterprise}/code-security/configurations/{configuration_id}/attach", "post">;
    /**
     * @see https://docs.github.com/rest/gists/gists#create-a-gist
     */
    "POST /gists": Operation<"/gists", "post">;
    /**
     * @see https://docs.github.com/rest/gists/comments#create-a-gist-comment
     */
    "POST /gists/{gist_id}/comments": Operation<"/gists/{gist_id}/comments", "post">;
    /**
     * @see https://docs.github.com/rest/gists/gists#fork-a-gist
     */
    "POST /gists/{gist_id}/forks": Operation<"/gists/{gist_id}/forks", "post">;
    /**
     * @see https://docs.github.com/rest/markdown/markdown#render-a-markdown-document
     */
    "POST /markdown": Operation<"/markdown", "post">;
    /**
     * @see https://docs.github.com/rest/markdown/markdown#render-a-markdown-document-in-raw-mode
     */
    "POST /markdown/raw": Operation<"/markdown/raw", "post">;
    /**
     * @see https://docs.github.com/rest/actions/hosted-runners#create-a-github-hosted-runner-for-an-organization
     */
    "POST /orgs/{org}/actions/hosted-runners": Operation<"/orgs/{org}/actions/hosted-runners", "post">;
    /**
     * @see https://docs.github.com/rest/actions/self-hosted-runner-groups#create-a-self-hosted-runner-group-for-an-organization
     */
    "POST /orgs/{org}/actions/runner-groups": Operation<"/orgs/{org}/actions/runner-groups", "post">;
    /**
     * @see https://docs.github.com/rest/actions/self-hosted-runners#create-configuration-for-a-just-in-time-runner-for-an-organization
     */
    "POST /orgs/{org}/actions/runners/generate-jitconfig": Operation<"/orgs/{org}/actions/runners/generate-jitconfig", "post">;
    /**
     * @see https://docs.github.com/rest/actions/self-hosted-runners#create-a-registration-token-for-an-organization
     */
    "POST /orgs/{org}/actions/runners/registration-token": Operation<"/orgs/{org}/actions/runners/registration-token", "post">;
    /**
     * @see https://docs.github.com/rest/actions/self-hosted-runners#create-a-remove-token-for-an-organization
     */
    "POST /orgs/{org}/actions/runners/remove-token": Operation<"/orgs/{org}/actions/runners/remove-token", "post">;
    /**
     * @see https://docs.github.com/rest/actions/self-hosted-runners#add-custom-labels-to-a-self-hosted-runner-for-an-organization
     */
    "POST /orgs/{org}/actions/runners/{runner_id}/labels": Operation<"/orgs/{org}/actions/runners/{runner_id}/labels", "post">;
    /**
     * @see https://docs.github.com/rest/actions/variables#create-an-organization-variable
     */
    "POST /orgs/{org}/actions/variables": Operation<"/orgs/{org}/actions/variables", "post">;
    /**
     * @see https://docs.github.com/rest/code-security/configurations#create-a-code-security-configuration
     */
    "POST /orgs/{org}/code-security/configurations": Operation<"/orgs/{org}/code-security/configurations", "post">;
    /**
     * @see https://docs.github.com/rest/code-security/configurations#attach-a-configuration-to-repositories
     */
    "POST /orgs/{org}/code-security/configurations/{configuration_id}/attach": Operation<"/orgs/{org}/code-security/configurations/{configuration_id}/attach", "post">;
    /**
     * @see https://docs.github.com/rest/codespaces/organizations#add-users-to-codespaces-access-for-an-organization
     */
    "POST /orgs/{org}/codespaces/access/selected_users": Operation<"/orgs/{org}/codespaces/access/selected_users", "post">;
    /**
     * @see https://docs.github.com/rest/copilot/copilot-user-management#add-teams-to-the-copilot-subscription-for-an-organization
     */
    "POST /orgs/{org}/copilot/billing/selected_teams": Operation<"/orgs/{org}/copilot/billing/selected_teams", "post">;
    /**
     * @see https://docs.github.com/rest/copilot/copilot-user-management#add-users-to-the-copilot-subscription-for-an-organization
     */
    "POST /orgs/{org}/copilot/billing/selected_users": Operation<"/orgs/{org}/copilot/billing/selected_users", "post">;
    /**
     * @see https://docs.github.com/rest/orgs/webhooks#create-an-organization-webhook
     */
    "POST /orgs/{org}/hooks": Operation<"/orgs/{org}/hooks", "post">;
    /**
     * @see https://docs.github.com/rest/orgs/webhooks#redeliver-a-delivery-for-an-organization-webhook
     */
    "POST /orgs/{org}/hooks/{hook_id}/deliveries/{delivery_id}/attempts": Operation<"/orgs/{org}/hooks/{hook_id}/deliveries/{delivery_id}/attempts", "post">;
    /**
     * @see https://docs.github.com/rest/orgs/webhooks#ping-an-organization-webhook
     */
    "POST /orgs/{org}/hooks/{hook_id}/pings": Operation<"/orgs/{org}/hooks/{hook_id}/pings", "post">;
    /**
     * @see https://docs.github.com/rest/orgs/members#create-an-organization-invitation
     */
    "POST /orgs/{org}/invitations": Operation<"/orgs/{org}/invitations", "post">;
    /**
     * @see https://docs.github.com/rest/orgs/issue-types#create-issue-type-for-an-organization
     */
    "POST /orgs/{org}/issue-types": Operation<"/orgs/{org}/issue-types", "post">;
    /**
     * @see https://docs.github.com/rest/codespaces/organizations#stop-a-codespace-for-an-organization-user
     */
    "POST /orgs/{org}/members/{username}/codespaces/{codespace_name}/stop": Operation<"/orgs/{org}/members/{username}/codespaces/{codespace_name}/stop", "post">;
    /**
     * @see https://docs.github.com/rest/migrations/orgs#start-an-organization-migration
     */
    "POST /orgs/{org}/migrations": Operation<"/orgs/{org}/migrations", "post">;
    /**
     * @see https://docs.github.com/rest/packages/packages#restore-a-package-for-an-organization
     */
    "POST /orgs/{org}/packages/{package_type}/{package_name}/restore{?token}": Operation<"/orgs/{org}/packages/{package_type}/{package_name}/restore", "post">;
    /**
     * @see https://docs.github.com/rest/packages/packages#restore-package-version-for-an-organization
     */
    "POST /orgs/{org}/packages/{package_type}/{package_name}/versions/{package_version_id}/restore": Operation<"/orgs/{org}/packages/{package_type}/{package_name}/versions/{package_version_id}/restore", "post">;
    /**
     * @see https://docs.github.com/rest/orgs/personal-access-tokens#review-requests-to-access-organization-resources-with-fine-grained-personal-access-tokens
     */
    "POST /orgs/{org}/personal-access-token-requests": Operation<"/orgs/{org}/personal-access-token-requests", "post">;
    /**
     * @see https://docs.github.com/rest/orgs/personal-access-tokens#review-a-request-to-access-organization-resources-with-a-fine-grained-personal-access-token
     */
    "POST /orgs/{org}/personal-access-token-requests/{pat_request_id}": Operation<"/orgs/{org}/personal-access-token-requests/{pat_request_id}", "post">;
    /**
     * @see https://docs.github.com/rest/orgs/personal-access-tokens#update-the-access-to-organization-resources-via-fine-grained-personal-access-tokens
     */
    "POST /orgs/{org}/personal-access-tokens": Operation<"/orgs/{org}/personal-access-tokens", "post">;
    /**
     * @see https://docs.github.com/rest/orgs/personal-access-tokens#update-the-access-a-fine-grained-personal-access-token-has-to-organization-resources
     */
    "POST /orgs/{org}/personal-access-tokens/{pat_id}": Operation<"/orgs/{org}/personal-access-tokens/{pat_id}", "post">;
    /**
     * @see https://docs.github.com/rest/private-registries/organization-configurations#create-a-private-registry-for-an-organization
     */
    "POST /orgs/{org}/private-registries": Operation<"/orgs/{org}/private-registries", "post">;
    /**
     * @see https://docs.github.com/rest/projects/projects#create-an-organization-project
     */
    "POST /orgs/{org}/projects": Operation<"/orgs/{org}/projects", "post">;
    /**
     * @see https://docs.github.com/rest/repos/repos#create-an-organization-repository
     */
    "POST /orgs/{org}/repos": Operation<"/orgs/{org}/repos", "post">;
    /**
     * @see https://docs.github.com/rest/orgs/rules#create-an-organization-repository-ruleset
     */
    "POST /orgs/{org}/rulesets": Operation<"/orgs/{org}/rulesets", "post">;
    /**
     * @see https://docs.github.com/rest/orgs/network-configurations#create-a-hosted-compute-network-configuration-for-an-organization
     */
    "POST /orgs/{org}/settings/network-configurations": Operation<"/orgs/{org}/settings/network-configurations", "post">;
    /**
     * @see https://docs.github.com/rest/teams/teams#create-a-team
     */
    "POST /orgs/{org}/teams": Operation<"/orgs/{org}/teams", "post">;
    /**
     * @see https://docs.github.com/rest/teams/discussions#create-a-discussion
     */
    "POST /orgs/{org}/teams/{team_slug}/discussions": Operation<"/orgs/{org}/teams/{team_slug}/discussions", "post">;
    /**
     * @see https://docs.github.com/rest/teams/discussion-comments#create-a-discussion-comment
     */
    "POST /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments": Operation<"/orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments", "post">;
    /**
     * @see https://docs.github.com/rest/reactions/reactions#create-reaction-for-a-team-discussion-comment
     */
    "POST /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments/{comment_number}/reactions": Operation<"/orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments/{comment_number}/reactions", "post">;
    /**
     * @see https://docs.github.com/rest/reactions/reactions#create-reaction-for-a-team-discussion
     */
    "POST /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/reactions": Operation<"/orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/reactions", "post">;
    /**
     * @see https://docs.github.com/rest/orgs/orgs#enable-or-disable-a-security-feature-for-an-organization
     */
    "POST /orgs/{org}/{security_product}/{enablement}": Operation<"/orgs/{org}/{security_product}/{enablement}", "post">;
    /**
     * @see https://docs.github.com/rest/projects/cards#move-a-project-card
     */
    "POST /projects/columns/cards/{card_id}/moves": Operation<"/projects/columns/cards/{card_id}/moves", "post">;
    /**
     * @see https://docs.github.com/rest/projects/cards#create-a-project-card
     */
    "POST /projects/columns/{column_id}/cards": Operation<"/projects/columns/{column_id}/cards", "post">;
    /**
     * @see https://docs.github.com/rest/projects/columns#move-a-project-column
     */
    "POST /projects/columns/{column_id}/moves": Operation<"/projects/columns/{column_id}/moves", "post">;
    /**
     * @see https://docs.github.com/rest/projects/columns#create-a-project-column
     */
    "POST /projects/{project_id}/columns": Operation<"/projects/{project_id}/columns", "post">;
    /**
     * @see https://docs.github.com/rest/actions/workflow-runs#re-run-a-job-from-a-workflow-run
     */
    "POST /repos/{owner}/{repo}/actions/jobs/{job_id}/rerun": Operation<"/repos/{owner}/{repo}/actions/jobs/{job_id}/rerun", "post">;
    /**
     * @see https://docs.github.com/rest/actions/self-hosted-runners#create-configuration-for-a-just-in-time-runner-for-a-repository
     */
    "POST /repos/{owner}/{repo}/actions/runners/generate-jitconfig": Operation<"/repos/{owner}/{repo}/actions/runners/generate-jitconfig", "post">;
    /**
     * @see https://docs.github.com/rest/actions/self-hosted-runners#create-a-registration-token-for-a-repository
     */
    "POST /repos/{owner}/{repo}/actions/runners/registration-token": Operation<"/repos/{owner}/{repo}/actions/runners/registration-token", "post">;
    /**
     * @see https://docs.github.com/rest/actions/self-hosted-runners#create-a-remove-token-for-a-repository
     */
    "POST /repos/{owner}/{repo}/actions/runners/remove-token": Operation<"/repos/{owner}/{repo}/actions/runners/remove-token", "post">;
    /**
     * @see https://docs.github.com/rest/actions/self-hosted-runners#add-custom-labels-to-a-self-hosted-runner-for-a-repository
     */
    "POST /repos/{owner}/{repo}/actions/runners/{runner_id}/labels": Operation<"/repos/{owner}/{repo}/actions/runners/{runner_id}/labels", "post">;
    /**
     * @see https://docs.github.com/rest/actions/workflow-runs#approve-a-workflow-run-for-a-fork-pull-request
     */
    "POST /repos/{owner}/{repo}/actions/runs/{run_id}/approve": Operation<"/repos/{owner}/{repo}/actions/runs/{run_id}/approve", "post">;
    /**
     * @see https://docs.github.com/rest/actions/workflow-runs#cancel-a-workflow-run
     */
    "POST /repos/{owner}/{repo}/actions/runs/{run_id}/cancel": Operation<"/repos/{owner}/{repo}/actions/runs/{run_id}/cancel", "post">;
    /**
     * @see https://docs.github.com/rest/actions/workflow-runs#review-custom-deployment-protection-rules-for-a-workflow-run
     */
    "POST /repos/{owner}/{repo}/actions/runs/{run_id}/deployment_protection_rule": Operation<"/repos/{owner}/{repo}/actions/runs/{run_id}/deployment_protection_rule", "post">;
    /**
     * @see https://docs.github.com/rest/actions/workflow-runs#force-cancel-a-workflow-run
     */
    "POST /repos/{owner}/{repo}/actions/runs/{run_id}/force-cancel": Operation<"/repos/{owner}/{repo}/actions/runs/{run_id}/force-cancel", "post">;
    /**
     * @see https://docs.github.com/rest/actions/workflow-runs#review-pending-deployments-for-a-workflow-run
     */
    "POST /repos/{owner}/{repo}/actions/runs/{run_id}/pending_deployments": Operation<"/repos/{owner}/{repo}/actions/runs/{run_id}/pending_deployments", "post">;
    /**
     * @see https://docs.github.com/rest/actions/workflow-runs#re-run-a-workflow
     */
    "POST /repos/{owner}/{repo}/actions/runs/{run_id}/rerun": Operation<"/repos/{owner}/{repo}/actions/runs/{run_id}/rerun", "post">;
    /**
     * @see https://docs.github.com/rest/actions/workflow-runs#re-run-failed-jobs-from-a-workflow-run
     */
    "POST /repos/{owner}/{repo}/actions/runs/{run_id}/rerun-failed-jobs": Operation<"/repos/{owner}/{repo}/actions/runs/{run_id}/rerun-failed-jobs", "post">;
    /**
     * @see https://docs.github.com/rest/actions/variables#create-a-repository-variable
     */
    "POST /repos/{owner}/{repo}/actions/variables": Operation<"/repos/{owner}/{repo}/actions/variables", "post">;
    /**
     * @see https://docs.github.com/rest/actions/workflows#create-a-workflow-dispatch-event
     */
    "POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches": Operation<"/repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches", "post">;
    /**
     * @see https://docs.github.com/rest/repos/repos#create-an-attestation
     */
    "POST /repos/{owner}/{repo}/attestations": Operation<"/repos/{owner}/{repo}/attestations", "post">;
    /**
     * @see https://docs.github.com/rest/repos/autolinks#create-an-autolink-reference-for-a-repository
     */
    "POST /repos/{owner}/{repo}/autolinks": Operation<"/repos/{owner}/{repo}/autolinks", "post">;
    /**
     * @see https://docs.github.com/rest/branches/branch-protection#set-admin-branch-protection
     */
    "POST /repos/{owner}/{repo}/branches/{branch}/protection/enforce_admins": Operation<"/repos/{owner}/{repo}/branches/{branch}/protection/enforce_admins", "post">;
    /**
     * @see https://docs.github.com/rest/branches/branch-protection#create-commit-signature-protection
     */
    "POST /repos/{owner}/{repo}/branches/{branch}/protection/required_signatures": Operation<"/repos/{owner}/{repo}/branches/{branch}/protection/required_signatures", "post">;
    /**
     * @see https://docs.github.com/rest/branches/branch-protection#add-status-check-contexts
     */
    "POST /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks/contexts": Operation<"/repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks/contexts", "post">;
    /**
     * @see https://docs.github.com/rest/branches/branch-protection#add-app-access-restrictions
     */
    "POST /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/apps": Operation<"/repos/{owner}/{repo}/branches/{branch}/protection/restrictions/apps", "post">;
    /**
     * @see https://docs.github.com/rest/branches/branch-protection#add-team-access-restrictions
     */
    "POST /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/teams": Operation<"/repos/{owner}/{repo}/branches/{branch}/protection/restrictions/teams", "post">;
    /**
     * @see https://docs.github.com/rest/branches/branch-protection#add-user-access-restrictions
     */
    "POST /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/users": Operation<"/repos/{owner}/{repo}/branches/{branch}/protection/restrictions/users", "post">;
    /**
     * @see https://docs.github.com/rest/branches/branches#rename-a-branch
     */
    "POST /repos/{owner}/{repo}/branches/{branch}/rename": Operation<"/repos/{owner}/{repo}/branches/{branch}/rename", "post">;
    /**
     * @see https://docs.github.com/rest/reference/checks#create-a-check-run
     */
    "POST /repos/{owner}/{repo}/check-runs": Operation<"/repos/{owner}/{repo}/check-runs", "post">;
    /**
     * @see https://docs.github.com/rest/checks/runs#rerequest-a-check-run
     */
    "POST /repos/{owner}/{repo}/check-runs/{check_run_id}/rerequest": Operation<"/repos/{owner}/{repo}/check-runs/{check_run_id}/rerequest", "post">;
    /**
     * @see https://docs.github.com/rest/checks/suites#create-a-check-suite
     */
    "POST /repos/{owner}/{repo}/check-suites": Operation<"/repos/{owner}/{repo}/check-suites", "post">;
    /**
     * @see https://docs.github.com/rest/checks/suites#rerequest-a-check-suite
     */
    "POST /repos/{owner}/{repo}/check-suites/{check_suite_id}/rerequest": Operation<"/repos/{owner}/{repo}/check-suites/{check_suite_id}/rerequest", "post">;
    /**
     * @see https://docs.github.com/rest/code-scanning/code-scanning#create-an-autofix-for-a-code-scanning-alert
     */
    "POST /repos/{owner}/{repo}/code-scanning/alerts/{alert_number}/autofix": Operation<"/repos/{owner}/{repo}/code-scanning/alerts/{alert_number}/autofix", "post">;
    /**
     * @see https://docs.github.com/rest/code-scanning/code-scanning#commit-an-autofix-for-a-code-scanning-alert
     */
    "POST /repos/{owner}/{repo}/code-scanning/alerts/{alert_number}/autofix/commits": Operation<"/repos/{owner}/{repo}/code-scanning/alerts/{alert_number}/autofix/commits", "post">;
    /**
     * @see https://docs.github.com/rest/code-scanning/code-scanning#create-a-codeql-variant-analysis
     */
    "POST /repos/{owner}/{repo}/code-scanning/codeql/variant-analyses": Operation<"/repos/{owner}/{repo}/code-scanning/codeql/variant-analyses", "post">;
    /**
     * @see https://docs.github.com/rest/code-scanning/code-scanning#upload-an-analysis-as-sarif-data
     */
    "POST /repos/{owner}/{repo}/code-scanning/sarifs": Operation<"/repos/{owner}/{repo}/code-scanning/sarifs", "post">;
    /**
     * @see https://docs.github.com/rest/codespaces/codespaces#create-a-codespace-in-a-repository
     */
    "POST /repos/{owner}/{repo}/codespaces": Operation<"/repos/{owner}/{repo}/codespaces", "post">;
    /**
     * @see https://docs.github.com/rest/reactions/reactions#create-reaction-for-a-commit-comment
     */
    "POST /repos/{owner}/{repo}/comments/{comment_id}/reactions": Operation<"/repos/{owner}/{repo}/comments/{comment_id}/reactions", "post">;
    /**
     * @see https://docs.github.com/rest/commits/comments#create-a-commit-comment
     */
    "POST /repos/{owner}/{repo}/commits/{commit_sha}/comments": Operation<"/repos/{owner}/{repo}/commits/{commit_sha}/comments", "post">;
    /**
     * @see https://docs.github.com/rest/dependency-graph/dependency-submission#create-a-snapshot-of-dependencies-for-a-repository
     */
    "POST /repos/{owner}/{repo}/dependency-graph/snapshots": Operation<"/repos/{owner}/{repo}/dependency-graph/snapshots", "post">;
    /**
     * @see https://docs.github.com/rest/deployments/deployments#create-a-deployment
     */
    "POST /repos/{owner}/{repo}/deployments": Operation<"/repos/{owner}/{repo}/deployments", "post">;
    /**
     * @see https://docs.github.com/rest/deployments/statuses#create-a-deployment-status
     */
    "POST /repos/{owner}/{repo}/deployments/{deployment_id}/statuses": Operation<"/repos/{owner}/{repo}/deployments/{deployment_id}/statuses", "post">;
    /**
     * @see https://docs.github.com/rest/repos/repos#create-a-repository-dispatch-event
     */
    "POST /repos/{owner}/{repo}/dispatches": Operation<"/repos/{owner}/{repo}/dispatches", "post">;
    /**
     * @see https://docs.github.com/rest/deployments/branch-policies#create-a-deployment-branch-policy
     */
    "POST /repos/{owner}/{repo}/environments/{environment_name}/deployment-branch-policies": Operation<"/repos/{owner}/{repo}/environments/{environment_name}/deployment-branch-policies", "post">;
    /**
     * @see https://docs.github.com/rest/deployments/protection-rules#create-a-custom-deployment-protection-rule-on-an-environment
     */
    "POST /repos/{owner}/{repo}/environments/{environment_name}/deployment_protection_rules": Operation<"/repos/{owner}/{repo}/environments/{environment_name}/deployment_protection_rules", "post">;
    /**
     * @see https://docs.github.com/rest/actions/variables#create-an-environment-variable
     */
    "POST /repos/{owner}/{repo}/environments/{environment_name}/variables": Operation<"/repos/{owner}/{repo}/environments/{environment_name}/variables", "post">;
    /**
     * @see https://docs.github.com/rest/repos/forks#create-a-fork
     */
    "POST /repos/{owner}/{repo}/forks": Operation<"/repos/{owner}/{repo}/forks", "post">;
    /**
     * @see https://docs.github.com/rest/git/blobs#create-a-blob
     */
    "POST /repos/{owner}/{repo}/git/blobs": Operation<"/repos/{owner}/{repo}/git/blobs", "post">;
    /**
     * @see https://docs.github.com/rest/git/commits#create-a-commit
     */
    "POST /repos/{owner}/{repo}/git/commits": Operation<"/repos/{owner}/{repo}/git/commits", "post">;
    /**
     * @see https://docs.github.com/rest/git/refs#create-a-reference
     */
    "POST /repos/{owner}/{repo}/git/refs": Operation<"/repos/{owner}/{repo}/git/refs", "post">;
    /**
     * @see https://docs.github.com/rest/git/tags#create-a-tag-object
     */
    "POST /repos/{owner}/{repo}/git/tags": Operation<"/repos/{owner}/{repo}/git/tags", "post">;
    /**
     * @see https://docs.github.com/rest/git/trees#create-a-tree
     */
    "POST /repos/{owner}/{repo}/git/trees": Operation<"/repos/{owner}/{repo}/git/trees", "post">;
    /**
     * @see https://docs.github.com/rest/repos/webhooks#create-a-repository-webhook
     */
    "POST /repos/{owner}/{repo}/hooks": Operation<"/repos/{owner}/{repo}/hooks", "post">;
    /**
     * @see https://docs.github.com/rest/repos/webhooks#redeliver-a-delivery-for-a-repository-webhook
     */
    "POST /repos/{owner}/{repo}/hooks/{hook_id}/deliveries/{delivery_id}/attempts": Operation<"/repos/{owner}/{repo}/hooks/{hook_id}/deliveries/{delivery_id}/attempts", "post">;
    /**
     * @see https://docs.github.com/rest/repos/webhooks#ping-a-repository-webhook
     */
    "POST /repos/{owner}/{repo}/hooks/{hook_id}/pings": Operation<"/repos/{owner}/{repo}/hooks/{hook_id}/pings", "post">;
    /**
     * @see https://docs.github.com/rest/repos/webhooks#test-the-push-repository-webhook
     */
    "POST /repos/{owner}/{repo}/hooks/{hook_id}/tests": Operation<"/repos/{owner}/{repo}/hooks/{hook_id}/tests", "post">;
    /**
     * @see https://docs.github.com/rest/issues/issues#create-an-issue
     */
    "POST /repos/{owner}/{repo}/issues": Operation<"/repos/{owner}/{repo}/issues", "post">;
    /**
     * @see https://docs.github.com/rest/reactions/reactions#create-reaction-for-an-issue-comment
     */
    "POST /repos/{owner}/{repo}/issues/comments/{comment_id}/reactions": Operation<"/repos/{owner}/{repo}/issues/comments/{comment_id}/reactions", "post">;
    /**
     * @see https://docs.github.com/rest/issues/assignees#add-assignees-to-an-issue
     */
    "POST /repos/{owner}/{repo}/issues/{issue_number}/assignees": Operation<"/repos/{owner}/{repo}/issues/{issue_number}/assignees", "post">;
    /**
     * @see https://docs.github.com/rest/issues/comments#create-an-issue-comment
     */
    "POST /repos/{owner}/{repo}/issues/{issue_number}/comments": Operation<"/repos/{owner}/{repo}/issues/{issue_number}/comments", "post">;
    /**
     * @see https://docs.github.com/rest/issues/labels#add-labels-to-an-issue
     */
    "POST /repos/{owner}/{repo}/issues/{issue_number}/labels": Operation<"/repos/{owner}/{repo}/issues/{issue_number}/labels", "post">;
    /**
     * @see https://docs.github.com/rest/reactions/reactions#create-reaction-for-an-issue
     */
    "POST /repos/{owner}/{repo}/issues/{issue_number}/reactions": Operation<"/repos/{owner}/{repo}/issues/{issue_number}/reactions", "post">;
    /**
     * @see https://docs.github.com/rest/issues/sub-issues#add-sub-issue
     */
    "POST /repos/{owner}/{repo}/issues/{issue_number}/sub_issues": Operation<"/repos/{owner}/{repo}/issues/{issue_number}/sub_issues", "post">;
    /**
     * @see https://docs.github.com/rest/deploy-keys/deploy-keys#create-a-deploy-key
     */
    "POST /repos/{owner}/{repo}/keys": Operation<"/repos/{owner}/{repo}/keys", "post">;
    /**
     * @see https://docs.github.com/rest/issues/labels#create-a-label
     */
    "POST /repos/{owner}/{repo}/labels": Operation<"/repos/{owner}/{repo}/labels", "post">;
    /**
     * @see https://docs.github.com/rest/branches/branches#sync-a-fork-branch-with-the-upstream-repository
     */
    "POST /repos/{owner}/{repo}/merge-upstream": Operation<"/repos/{owner}/{repo}/merge-upstream", "post">;
    /**
     * @see https://docs.github.com/rest/branches/branches#merge-a-branch
     */
    "POST /repos/{owner}/{repo}/merges": Operation<"/repos/{owner}/{repo}/merges", "post">;
    /**
     * @see https://docs.github.com/rest/issues/milestones#create-a-milestone
     */
    "POST /repos/{owner}/{repo}/milestones": Operation<"/repos/{owner}/{repo}/milestones", "post">;
    /**
     * @see https://docs.github.com/rest/pages/pages#create-a-apiname-pages-site
     */
    "POST /repos/{owner}/{repo}/pages": Operation<"/repos/{owner}/{repo}/pages", "post">;
    /**
     * @see https://docs.github.com/rest/pages/pages#request-a-apiname-pages-build
     */
    "POST /repos/{owner}/{repo}/pages/builds": Operation<"/repos/{owner}/{repo}/pages/builds", "post">;
    /**
     * @see https://docs.github.com/rest/pages/pages#create-a-github-pages-deployment
     */
    "POST /repos/{owner}/{repo}/pages/deployments": Operation<"/repos/{owner}/{repo}/pages/deployments", "post">;
    /**
     * @see https://docs.github.com/rest/pages/pages#cancel-a-github-pages-deployment
     */
    "POST /repos/{owner}/{repo}/pages/deployments/{pages_deployment_id}/cancel": Operation<"/repos/{owner}/{repo}/pages/deployments/{pages_deployment_id}/cancel", "post">;
    /**
     * @see https://docs.github.com/rest/projects/projects#create-a-repository-project
     */
    "POST /repos/{owner}/{repo}/projects": Operation<"/repos/{owner}/{repo}/projects", "post">;
    /**
     * @see https://docs.github.com/rest/pulls/pulls#create-a-pull-request
     */
    "POST /repos/{owner}/{repo}/pulls": Operation<"/repos/{owner}/{repo}/pulls", "post">;
    /**
     * @see https://docs.github.com/rest/reactions/reactions#create-reaction-for-a-pull-request-review-comment
     */
    "POST /repos/{owner}/{repo}/pulls/comments/{comment_id}/reactions": Operation<"/repos/{owner}/{repo}/pulls/comments/{comment_id}/reactions", "post">;
    /**
     * @see https://docs.github.com/rest/codespaces/codespaces#create-a-codespace-from-a-pull-request
     */
    "POST /repos/{owner}/{repo}/pulls/{pull_number}/codespaces": Operation<"/repos/{owner}/{repo}/pulls/{pull_number}/codespaces", "post">;
    /**
     * @see https://docs.github.com/rest/pulls/comments#create-a-review-comment-for-a-pull-request
     */
    "POST /repos/{owner}/{repo}/pulls/{pull_number}/comments": Operation<"/repos/{owner}/{repo}/pulls/{pull_number}/comments", "post">;
    /**
     * @see https://docs.github.com/rest/pulls/comments#create-a-reply-for-a-review-comment
     */
    "POST /repos/{owner}/{repo}/pulls/{pull_number}/comments/{comment_id}/replies": Operation<"/repos/{owner}/{repo}/pulls/{pull_number}/comments/{comment_id}/replies", "post">;
    /**
     * @see https://docs.github.com/rest/reference/pulls#request-reviewers-for-a-pull-request
     */
    "POST /repos/{owner}/{repo}/pulls/{pull_number}/requested_reviewers": Operation<"/repos/{owner}/{repo}/pulls/{pull_number}/requested_reviewers", "post">;
    /**
     * @see https://docs.github.com/rest/pulls/reviews#create-a-review-for-a-pull-request
     */
    "POST /repos/{owner}/{repo}/pulls/{pull_number}/reviews": Operation<"/repos/{owner}/{repo}/pulls/{pull_number}/reviews", "post">;
    /**
     * @see https://docs.github.com/rest/pulls/reviews#submit-a-review-for-a-pull-request
     */
    "POST /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}/events": Operation<"/repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}/events", "post">;
    /**
     * @see https://docs.github.com/rest/releases/releases#create-a-release
     */
    "POST /repos/{owner}/{repo}/releases": Operation<"/repos/{owner}/{repo}/releases", "post">;
    /**
     * @see https://docs.github.com/rest/releases/releases#generate-release-notes-content-for-a-release
     */
    "POST /repos/{owner}/{repo}/releases/generate-notes": Operation<"/repos/{owner}/{repo}/releases/generate-notes", "post">;
    /**
     * @see https://docs.github.com/rest/reactions/reactions#create-reaction-for-a-release
     */
    "POST /repos/{owner}/{repo}/releases/{release_id}/reactions": Operation<"/repos/{owner}/{repo}/releases/{release_id}/reactions", "post">;
    /**
     * @see https://docs.github.com/rest/repos/rules#create-a-repository-ruleset
     */
    "POST /repos/{owner}/{repo}/rulesets": Operation<"/repos/{owner}/{repo}/rulesets", "post">;
    /**
     * @see https://docs.github.com/rest/secret-scanning/secret-scanning#create-a-push-protection-bypass
     */
    "POST /repos/{owner}/{repo}/secret-scanning/push-protection-bypasses": Operation<"/repos/{owner}/{repo}/secret-scanning/push-protection-bypasses", "post">;
    /**
     * @see https://docs.github.com/rest/security-advisories/repository-advisories#create-a-repository-security-advisory
     */
    "POST /repos/{owner}/{repo}/security-advisories": Operation<"/repos/{owner}/{repo}/security-advisories", "post">;
    /**
     * @see https://docs.github.com/rest/security-advisories/repository-advisories#privately-report-a-security-vulnerability
     */
    "POST /repos/{owner}/{repo}/security-advisories/reports": Operation<"/repos/{owner}/{repo}/security-advisories/reports", "post">;
    /**
     * @see https://docs.github.com/rest/security-advisories/repository-advisories#request-a-cve-for-a-repository-security-advisory
     */
    "POST /repos/{owner}/{repo}/security-advisories/{ghsa_id}/cve": Operation<"/repos/{owner}/{repo}/security-advisories/{ghsa_id}/cve", "post">;
    /**
     * @see https://docs.github.com/rest/security-advisories/repository-advisories#create-a-temporary-private-fork
     */
    "POST /repos/{owner}/{repo}/security-advisories/{ghsa_id}/forks": Operation<"/repos/{owner}/{repo}/security-advisories/{ghsa_id}/forks", "post">;
    /**
     * @see https://docs.github.com/rest/commits/statuses#create-a-commit-status
     */
    "POST /repos/{owner}/{repo}/statuses/{sha}": Operation<"/repos/{owner}/{repo}/statuses/{sha}", "post">;
    /**
     * @see https://docs.github.com/rest/repos/tags#closing-down---create-a-tag-protection-state-for-a-repository
     */
    "POST /repos/{owner}/{repo}/tags/protection": Operation<"/repos/{owner}/{repo}/tags/protection", "post">;
    /**
     * @see https://docs.github.com/rest/repos/repos#transfer-a-repository
     */
    "POST /repos/{owner}/{repo}/transfer": Operation<"/repos/{owner}/{repo}/transfer", "post">;
    /**
     * @see https://docs.github.com/rest/repos/repos#create-a-repository-using-a-template
     */
    "POST /repos/{template_owner}/{template_repo}/generate": Operation<"/repos/{template_owner}/{template_repo}/generate", "post">;
    /**
     * @see https://docs.github.com/rest/teams/discussions#create-a-discussion-legacy
     */
    "POST /teams/{team_id}/discussions": Operation<"/teams/{team_id}/discussions", "post">;
    /**
     * @see https://docs.github.com/rest/teams/discussion-comments#create-a-discussion-comment-legacy
     */
    "POST /teams/{team_id}/discussions/{discussion_number}/comments": Operation<"/teams/{team_id}/discussions/{discussion_number}/comments", "post">;
    /**
     * @see https://docs.github.com/rest/reactions/reactions#create-reaction-for-a-team-discussion-comment-legacy
     */
    "POST /teams/{team_id}/discussions/{discussion_number}/comments/{comment_number}/reactions": Operation<"/teams/{team_id}/discussions/{discussion_number}/comments/{comment_number}/reactions", "post">;
    /**
     * @see https://docs.github.com/rest/reactions/reactions#create-reaction-for-a-team-discussion-legacy
     */
    "POST /teams/{team_id}/discussions/{discussion_number}/reactions": Operation<"/teams/{team_id}/discussions/{discussion_number}/reactions", "post">;
    /**
     * @see https://docs.github.com/rest/codespaces/codespaces#create-a-codespace-for-the-authenticated-user
     */
    "POST /user/codespaces": Operation<"/user/codespaces", "post">;
    /**
     * @see https://docs.github.com/rest/codespaces/codespaces#export-a-codespace-for-the-authenticated-user
     */
    "POST /user/codespaces/{codespace_name}/exports": Operation<"/user/codespaces/{codespace_name}/exports", "post">;
    /**
     * @see https://docs.github.com/rest/codespaces/codespaces#create-a-repository-from-an-unpublished-codespace
     */
    "POST /user/codespaces/{codespace_name}/publish": Operation<"/user/codespaces/{codespace_name}/publish", "post">;
    /**
     * @see https://docs.github.com/rest/codespaces/codespaces#start-a-codespace-for-the-authenticated-user
     */
    "POST /user/codespaces/{codespace_name}/start": Operation<"/user/codespaces/{codespace_name}/start", "post">;
    /**
     * @see https://docs.github.com/rest/codespaces/codespaces#stop-a-codespace-for-the-authenticated-user
     */
    "POST /user/codespaces/{codespace_name}/stop": Operation<"/user/codespaces/{codespace_name}/stop", "post">;
    /**
     * @see https://docs.github.com/rest/users/emails#add-an-email-address-for-the-authenticated-user
     */
    "POST /user/emails": Operation<"/user/emails", "post">;
    /**
     * @see https://docs.github.com/rest/users/gpg-keys#create-a-gpg-key-for-the-authenticated-user
     */
    "POST /user/gpg_keys": Operation<"/user/gpg_keys", "post">;
    /**
     * @see https://docs.github.com/rest/users/keys#create-a-public-ssh-key-for-the-authenticated-user
     */
    "POST /user/keys": Operation<"/user/keys", "post">;
    /**
     * @see https://docs.github.com/rest/migrations/users#start-a-user-migration
     */
    "POST /user/migrations": Operation<"/user/migrations", "post">;
    /**
     * @see https://docs.github.com/rest/packages/packages#restore-a-package-for-the-authenticated-user
     */
    "POST /user/packages/{package_type}/{package_name}/restore{?token}": Operation<"/user/packages/{package_type}/{package_name}/restore", "post">;
    /**
     * @see https://docs.github.com/rest/packages/packages#restore-a-package-version-for-the-authenticated-user
     */
    "POST /user/packages/{package_type}/{package_name}/versions/{package_version_id}/restore": Operation<"/user/packages/{package_type}/{package_name}/versions/{package_version_id}/restore", "post">;
    /**
     * @see https://docs.github.com/rest/projects/projects#create-a-user-project
     */
    "POST /user/projects": Operation<"/user/projects", "post">;
    /**
     * @see https://docs.github.com/rest/repos/repos#create-a-repository-for-the-authenticated-user
     */
    "POST /user/repos": Operation<"/user/repos", "post">;
    /**
     * @see https://docs.github.com/rest/users/social-accounts#add-social-accounts-for-the-authenticated-user
     */
    "POST /user/social_accounts": Operation<"/user/social_accounts", "post">;
    /**
     * @see https://docs.github.com/rest/users/ssh-signing-keys#create-a-ssh-signing-key-for-the-authenticated-user
     */
    "POST /user/ssh_signing_keys": Operation<"/user/ssh_signing_keys", "post">;
    /**
     * @see https://docs.github.com/rest/packages/packages#restore-a-package-for-a-user
     */
    "POST /users/{username}/packages/{package_type}/{package_name}/restore{?token}": Operation<"/users/{username}/packages/{package_type}/{package_name}/restore", "post">;
    /**
     * @see https://docs.github.com/rest/packages/packages#restore-package-version-for-a-user
     */
    "POST /users/{username}/packages/{package_type}/{package_name}/versions/{package_version_id}/restore": Operation<"/users/{username}/packages/{package_type}/{package_name}/versions/{package_version_id}/restore", "post">;
    /**
     * @see https://docs.github.com/rest/releases/assets#upload-a-release-asset
     */
    "POST {origin}/repos/{owner}/{repo}/releases/{release_id}/assets{?name,label}": Operation<"/repos/{owner}/{repo}/releases/{release_id}/assets", "post">;
    /**
     * @see https://docs.github.com/rest/apps/apps#suspend-an-app-installation
     */
    "PUT /app/installations/{installation_id}/suspended": Operation<"/app/installations/{installation_id}/suspended", "put">;
    /**
     * @see https://docs.github.com/rest/code-security/configurations#set-a-code-security-configuration-as-a-default-for-an-enterprise
     */
    "PUT /enterprises/{enterprise}/code-security/configurations/{configuration_id}/defaults": Operation<"/enterprises/{enterprise}/code-security/configurations/{configuration_id}/defaults", "put">;
    /**
     * @see https://docs.github.com/rest/gists/gists#star-a-gist
     */
    "PUT /gists/{gist_id}/star": Operation<"/gists/{gist_id}/star", "put">;
    /**
     * @see https://docs.github.com/rest/activity/notifications#mark-notifications-as-read
     */
    "PUT /notifications": Operation<"/notifications", "put">;
    /**
     * @see https://docs.github.com/rest/activity/notifications#set-a-thread-subscription
     */
    "PUT /notifications/threads/{thread_id}/subscription": Operation<"/notifications/threads/{thread_id}/subscription", "put">;
    /**
     * @see https://docs.github.com/rest/actions/oidc#set-the-customization-template-for-an-oidc-subject-claim-for-an-organization
     */
    "PUT /orgs/{org}/actions/oidc/customization/sub": Operation<"/orgs/{org}/actions/oidc/customization/sub", "put">;
    /**
     * @see https://docs.github.com/rest/actions/permissions#set-github-actions-permissions-for-an-organization
     */
    "PUT /orgs/{org}/actions/permissions": Operation<"/orgs/{org}/actions/permissions", "put">;
    /**
     * @see https://docs.github.com/rest/actions/permissions#set-selected-repositories-enabled-for-github-actions-in-an-organization
     */
    "PUT /orgs/{org}/actions/permissions/repositories": Operation<"/orgs/{org}/actions/permissions/repositories", "put">;
    /**
     * @see https://docs.github.com/rest/actions/permissions#enable-a-selected-repository-for-github-actions-in-an-organization
     */
    "PUT /orgs/{org}/actions/permissions/repositories/{repository_id}": Operation<"/orgs/{org}/actions/permissions/repositories/{repository_id}", "put">;
    /**
     * @see https://docs.github.com/rest/actions/permissions#set-allowed-actions-and-reusable-workflows-for-an-organization
     */
    "PUT /orgs/{org}/actions/permissions/selected-actions": Operation<"/orgs/{org}/actions/permissions/selected-actions", "put">;
    /**
     * @see https://docs.github.com/rest/actions/permissions#set-default-workflow-permissions-for-an-organization
     */
    "PUT /orgs/{org}/actions/permissions/workflow": Operation<"/orgs/{org}/actions/permissions/workflow", "put">;
    /**
     * @see https://docs.github.com/rest/actions/self-hosted-runner-groups#set-repository-access-for-a-self-hosted-runner-group-in-an-organization
     */
    "PUT /orgs/{org}/actions/runner-groups/{runner_group_id}/repositories": Operation<"/orgs/{org}/actions/runner-groups/{runner_group_id}/repositories", "put">;
    /**
     * @see https://docs.github.com/rest/actions/self-hosted-runner-groups#add-repository-access-to-a-self-hosted-runner-group-in-an-organization
     */
    "PUT /orgs/{org}/actions/runner-groups/{runner_group_id}/repositories/{repository_id}": Operation<"/orgs/{org}/actions/runner-groups/{runner_group_id}/repositories/{repository_id}", "put">;
    /**
     * @see https://docs.github.com/rest/actions/self-hosted-runner-groups#set-self-hosted-runners-in-a-group-for-an-organization
     */
    "PUT /orgs/{org}/actions/runner-groups/{runner_group_id}/runners": Operation<"/orgs/{org}/actions/runner-groups/{runner_group_id}/runners", "put">;
    /**
     * @see https://docs.github.com/rest/actions/self-hosted-runner-groups#add-a-self-hosted-runner-to-a-group-for-an-organization
     */
    "PUT /orgs/{org}/actions/runner-groups/{runner_group_id}/runners/{runner_id}": Operation<"/orgs/{org}/actions/runner-groups/{runner_group_id}/runners/{runner_id}", "put">;
    /**
     * @see https://docs.github.com/rest/actions/self-hosted-runners#set-custom-labels-for-a-self-hosted-runner-for-an-organization
     */
    "PUT /orgs/{org}/actions/runners/{runner_id}/labels": Operation<"/orgs/{org}/actions/runners/{runner_id}/labels", "put">;
    /**
     * @see https://docs.github.com/rest/reference/actions#create-or-update-an-organization-secret
     */
    "PUT /orgs/{org}/actions/secrets/{secret_name}": Operation<"/orgs/{org}/actions/secrets/{secret_name}", "put">;
    /**
     * @see https://docs.github.com/rest/actions/secrets#set-selected-repositories-for-an-organization-secret
     */
    "PUT /orgs/{org}/actions/secrets/{secret_name}/repositories": Operation<"/orgs/{org}/actions/secrets/{secret_name}/repositories", "put">;
    /**
     * @see https://docs.github.com/rest/actions/secrets#add-selected-repository-to-an-organization-secret
     */
    "PUT /orgs/{org}/actions/secrets/{secret_name}/repositories/{repository_id}": Operation<"/orgs/{org}/actions/secrets/{secret_name}/repositories/{repository_id}", "put">;
    /**
     * @see https://docs.github.com/rest/actions/variables#set-selected-repositories-for-an-organization-variable
     */
    "PUT /orgs/{org}/actions/variables/{name}/repositories": Operation<"/orgs/{org}/actions/variables/{name}/repositories", "put">;
    /**
     * @see https://docs.github.com/rest/actions/variables#add-selected-repository-to-an-organization-variable
     */
    "PUT /orgs/{org}/actions/variables/{name}/repositories/{repository_id}": Operation<"/orgs/{org}/actions/variables/{name}/repositories/{repository_id}", "put">;
    /**
     * @see https://docs.github.com/rest/orgs/blocking#block-a-user-from-an-organization
     */
    "PUT /orgs/{org}/blocks/{username}": Operation<"/orgs/{org}/blocks/{username}", "put">;
    /**
     * @see https://docs.github.com/rest/code-security/configurations#set-a-code-security-configuration-as-a-default-for-an-organization
     */
    "PUT /orgs/{org}/code-security/configurations/{configuration_id}/defaults": Operation<"/orgs/{org}/code-security/configurations/{configuration_id}/defaults", "put">;
    /**
     * @see https://docs.github.com/rest/codespaces/organizations#manage-access-control-for-organization-codespaces
     */
    "PUT /orgs/{org}/codespaces/access": Operation<"/orgs/{org}/codespaces/access", "put">;
    /**
     * @see https://docs.github.com/rest/codespaces/organization-secrets#create-or-update-an-organization-secret
     */
    "PUT /orgs/{org}/codespaces/secrets/{secret_name}": Operation<"/orgs/{org}/codespaces/secrets/{secret_name}", "put">;
    /**
     * @see https://docs.github.com/rest/codespaces/organization-secrets#set-selected-repositories-for-an-organization-secret
     */
    "PUT /orgs/{org}/codespaces/secrets/{secret_name}/repositories": Operation<"/orgs/{org}/codespaces/secrets/{secret_name}/repositories", "put">;
    /**
     * @see https://docs.github.com/rest/codespaces/organization-secrets#add-selected-repository-to-an-organization-secret
     */
    "PUT /orgs/{org}/codespaces/secrets/{secret_name}/repositories/{repository_id}": Operation<"/orgs/{org}/codespaces/secrets/{secret_name}/repositories/{repository_id}", "put">;
    /**
     * @see https://docs.github.com/rest/reference/dependabot#create-or-update-an-organization-secret
     */
    "PUT /orgs/{org}/dependabot/secrets/{secret_name}": Operation<"/orgs/{org}/dependabot/secrets/{secret_name}", "put">;
    /**
     * @see https://docs.github.com/rest/dependabot/secrets#set-selected-repositories-for-an-organization-secret
     */
    "PUT /orgs/{org}/dependabot/secrets/{secret_name}/repositories": Operation<"/orgs/{org}/dependabot/secrets/{secret_name}/repositories", "put">;
    /**
     * @see https://docs.github.com/rest/dependabot/secrets#add-selected-repository-to-an-organization-secret
     */
    "PUT /orgs/{org}/dependabot/secrets/{secret_name}/repositories/{repository_id}": Operation<"/orgs/{org}/dependabot/secrets/{secret_name}/repositories/{repository_id}", "put">;
    /**
     * @see https://docs.github.com/rest/interactions/orgs#set-interaction-restrictions-for-an-organization
     */
    "PUT /orgs/{org}/interaction-limits": Operation<"/orgs/{org}/interaction-limits", "put">;
    /**
     * @see https://docs.github.com/rest/orgs/issue-types#update-issue-type-for-an-organization
     */
    "PUT /orgs/{org}/issue-types/{issue_type_id}": Operation<"/orgs/{org}/issue-types/{issue_type_id}", "put">;
    /**
     * @see https://docs.github.com/rest/orgs/members#set-organization-membership-for-a-user
     */
    "PUT /orgs/{org}/memberships/{username}": Operation<"/orgs/{org}/memberships/{username}", "put">;
    /**
     * @see https://docs.github.com/rest/orgs/organization-roles#assign-an-organization-role-to-a-team
     */
    "PUT /orgs/{org}/organization-roles/teams/{team_slug}/{role_id}": Operation<"/orgs/{org}/organization-roles/teams/{team_slug}/{role_id}", "put">;
    /**
     * @see https://docs.github.com/rest/orgs/organization-roles#assign-an-organization-role-to-a-user
     */
    "PUT /orgs/{org}/organization-roles/users/{username}/{role_id}": Operation<"/orgs/{org}/organization-roles/users/{username}/{role_id}", "put">;
    /**
     * @see https://docs.github.com/rest/orgs/outside-collaborators#convert-an-organization-member-to-outside-collaborator
     */
    "PUT /orgs/{org}/outside_collaborators/{username}": Operation<"/orgs/{org}/outside_collaborators/{username}", "put">;
    /**
     * @see https://docs.github.com/rest/orgs/custom-properties#create-or-update-a-custom-property-for-an-organization
     */
    "PUT /orgs/{org}/properties/schema/{custom_property_name}": Operation<"/orgs/{org}/properties/schema/{custom_property_name}", "put">;
    /**
     * @see https://docs.github.com/rest/orgs/members#set-public-organization-membership-for-the-authenticated-user
     */
    "PUT /orgs/{org}/public_members/{username}": Operation<"/orgs/{org}/public_members/{username}", "put">;
    /**
     * @see https://docs.github.com/rest/orgs/rules#update-an-organization-repository-ruleset
     */
    "PUT /orgs/{org}/rulesets/{ruleset_id}": Operation<"/orgs/{org}/rulesets/{ruleset_id}", "put">;
    /**
     * @see https://docs.github.com/rest/orgs/security-managers#add-a-security-manager-team
     */
    "PUT /orgs/{org}/security-managers/teams/{team_slug}": Operation<"/orgs/{org}/security-managers/teams/{team_slug}", "put">;
    /**
     * @see https://docs.github.com/rest/teams/members#add-or-update-team-membership-for-a-user
     */
    "PUT /orgs/{org}/teams/{team_slug}/memberships/{username}": Operation<"/orgs/{org}/teams/{team_slug}/memberships/{username}", "put">;
    /**
     * @see https://docs.github.com/rest/teams/teams#add-or-update-team-project-permissions
     */
    "PUT /orgs/{org}/teams/{team_slug}/projects/{project_id}": Operation<"/orgs/{org}/teams/{team_slug}/projects/{project_id}", "put">;
    /**
     * @see https://docs.github.com/rest/teams/teams#add-or-update-team-repository-permissions
     */
    "PUT /orgs/{org}/teams/{team_slug}/repos/{owner}/{repo}": Operation<"/orgs/{org}/teams/{team_slug}/repos/{owner}/{repo}", "put">;
    /**
     * @see https://docs.github.com/rest/projects/collaborators#add-project-collaborator
     */
    "PUT /projects/{project_id}/collaborators/{username}": Operation<"/projects/{project_id}/collaborators/{username}", "put">;
    /**
     * @see https://docs.github.com/rest/actions/oidc#set-the-customization-template-for-an-oidc-subject-claim-for-a-repository
     */
    "PUT /repos/{owner}/{repo}/actions/oidc/customization/sub": Operation<"/repos/{owner}/{repo}/actions/oidc/customization/sub", "put">;
    /**
     * @see https://docs.github.com/rest/actions/permissions#set-github-actions-permissions-for-a-repository
     */
    "PUT /repos/{owner}/{repo}/actions/permissions": Operation<"/repos/{owner}/{repo}/actions/permissions", "put">;
    /**
     * @see https://docs.github.com/rest/actions/permissions#set-the-level-of-access-for-workflows-outside-of-the-repository
     */
    "PUT /repos/{owner}/{repo}/actions/permissions/access": Operation<"/repos/{owner}/{repo}/actions/permissions/access", "put">;
    /**
     * @see https://docs.github.com/rest/actions/permissions#set-allowed-actions-and-reusable-workflows-for-a-repository
     */
    "PUT /repos/{owner}/{repo}/actions/permissions/selected-actions": Operation<"/repos/{owner}/{repo}/actions/permissions/selected-actions", "put">;
    /**
     * @see https://docs.github.com/rest/actions/permissions#set-default-workflow-permissions-for-a-repository
     */
    "PUT /repos/{owner}/{repo}/actions/permissions/workflow": Operation<"/repos/{owner}/{repo}/actions/permissions/workflow", "put">;
    /**
     * @see https://docs.github.com/rest/actions/self-hosted-runners#set-custom-labels-for-a-self-hosted-runner-for-a-repository
     */
    "PUT /repos/{owner}/{repo}/actions/runners/{runner_id}/labels": Operation<"/repos/{owner}/{repo}/actions/runners/{runner_id}/labels", "put">;
    /**
     * @see https://docs.github.com/rest/actions/secrets#create-or-update-a-repository-secret
     */
    "PUT /repos/{owner}/{repo}/actions/secrets/{secret_name}": Operation<"/repos/{owner}/{repo}/actions/secrets/{secret_name}", "put">;
    /**
     * @see https://docs.github.com/rest/actions/workflows#disable-a-workflow
     */
    "PUT /repos/{owner}/{repo}/actions/workflows/{workflow_id}/disable": Operation<"/repos/{owner}/{repo}/actions/workflows/{workflow_id}/disable", "put">;
    /**
     * @see https://docs.github.com/rest/actions/workflows#enable-a-workflow
     */
    "PUT /repos/{owner}/{repo}/actions/workflows/{workflow_id}/enable": Operation<"/repos/{owner}/{repo}/actions/workflows/{workflow_id}/enable", "put">;
    /**
     * @see https://docs.github.com/rest/repos/repos#enable-dependabot-security-updates
     */
    "PUT /repos/{owner}/{repo}/automated-security-fixes": Operation<"/repos/{owner}/{repo}/automated-security-fixes", "put">;
    /**
     * @see https://docs.github.com/rest/branches/branch-protection#update-branch-protection
     */
    "PUT /repos/{owner}/{repo}/branches/{branch}/protection": Operation<"/repos/{owner}/{repo}/branches/{branch}/protection", "put">;
    /**
     * @see https://docs.github.com/rest/branches/branch-protection#set-status-check-contexts
     */
    "PUT /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks/contexts": Operation<"/repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks/contexts", "put">;
    /**
     * @see https://docs.github.com/rest/branches/branch-protection#set-app-access-restrictions
     */
    "PUT /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/apps": Operation<"/repos/{owner}/{repo}/branches/{branch}/protection/restrictions/apps", "put">;
    /**
     * @see https://docs.github.com/rest/branches/branch-protection#set-team-access-restrictions
     */
    "PUT /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/teams": Operation<"/repos/{owner}/{repo}/branches/{branch}/protection/restrictions/teams", "put">;
    /**
     * @see https://docs.github.com/rest/branches/branch-protection#set-user-access-restrictions
     */
    "PUT /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/users": Operation<"/repos/{owner}/{repo}/branches/{branch}/protection/restrictions/users", "put">;
    /**
     * @see https://docs.github.com/rest/codespaces/repository-secrets#create-or-update-a-repository-secret
     */
    "PUT /repos/{owner}/{repo}/codespaces/secrets/{secret_name}": Operation<"/repos/{owner}/{repo}/codespaces/secrets/{secret_name}", "put">;
    /**
     * @see https://docs.github.com/rest/collaborators/collaborators#add-a-repository-collaborator
     */
    "PUT /repos/{owner}/{repo}/collaborators/{username}": Operation<"/repos/{owner}/{repo}/collaborators/{username}", "put">;
    /**
     * @see https://docs.github.com/rest/repos/contents#create-or-update-file-contents
     */
    "PUT /repos/{owner}/{repo}/contents/{path}": Operation<"/repos/{owner}/{repo}/contents/{path}", "put">;
    /**
     * @see https://docs.github.com/rest/dependabot/secrets#create-or-update-a-repository-secret
     */
    "PUT /repos/{owner}/{repo}/dependabot/secrets/{secret_name}": Operation<"/repos/{owner}/{repo}/dependabot/secrets/{secret_name}", "put">;
    /**
     * @see https://docs.github.com/rest/deployments/environments#create-or-update-an-environment
     */
    "PUT /repos/{owner}/{repo}/environments/{environment_name}": Operation<"/repos/{owner}/{repo}/environments/{environment_name}", "put">;
    /**
     * @see https://docs.github.com/rest/deployments/branch-policies#update-a-deployment-branch-policy
     */
    "PUT /repos/{owner}/{repo}/environments/{environment_name}/deployment-branch-policies/{branch_policy_id}": Operation<"/repos/{owner}/{repo}/environments/{environment_name}/deployment-branch-policies/{branch_policy_id}", "put">;
    /**
     * @see https://docs.github.com/rest/actions/secrets#create-or-update-an-environment-secret
     */
    "PUT /repos/{owner}/{repo}/environments/{environment_name}/secrets/{secret_name}": Operation<"/repos/{owner}/{repo}/environments/{environment_name}/secrets/{secret_name}", "put">;
    /**
     * @see https://docs.github.com/rest/migrations/source-imports#start-an-import
     */
    "PUT /repos/{owner}/{repo}/import": Operation<"/repos/{owner}/{repo}/import", "put">;
    /**
     * @see https://docs.github.com/rest/interactions/repos#set-interaction-restrictions-for-a-repository
     */
    "PUT /repos/{owner}/{repo}/interaction-limits": Operation<"/repos/{owner}/{repo}/interaction-limits", "put">;
    /**
     * @see https://docs.github.com/rest/issues/labels#set-labels-for-an-issue
     */
    "PUT /repos/{owner}/{repo}/issues/{issue_number}/labels": Operation<"/repos/{owner}/{repo}/issues/{issue_number}/labels", "put">;
    /**
     * @see https://docs.github.com/rest/issues/issues#lock-an-issue
     */
    "PUT /repos/{owner}/{repo}/issues/{issue_number}/lock": Operation<"/repos/{owner}/{repo}/issues/{issue_number}/lock", "put">;
    /**
     * @see https://docs.github.com/rest/activity/notifications#mark-repository-notifications-as-read
     */
    "PUT /repos/{owner}/{repo}/notifications": Operation<"/repos/{owner}/{repo}/notifications", "put">;
    /**
     * @see https://docs.github.com/rest/pages/pages#update-information-about-a-apiname-pages-site
     */
    "PUT /repos/{owner}/{repo}/pages": Operation<"/repos/{owner}/{repo}/pages", "put">;
    /**
     * @see https://docs.github.com/rest/repos/repos#enable-private-vulnerability-reporting-for-a-repository
     */
    "PUT /repos/{owner}/{repo}/private-vulnerability-reporting": Operation<"/repos/{owner}/{repo}/private-vulnerability-reporting", "put">;
    /**
     * @see https://docs.github.com/rest/pulls/pulls#merge-a-pull-request
     */
    "PUT /repos/{owner}/{repo}/pulls/{pull_number}/merge": Operation<"/repos/{owner}/{repo}/pulls/{pull_number}/merge", "put">;
    /**
     * @see https://docs.github.com/rest/pulls/reviews#update-a-review-for-a-pull-request
     */
    "PUT /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}": Operation<"/repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}", "put">;
    /**
     * @see https://docs.github.com/rest/pulls/reviews#dismiss-a-review-for-a-pull-request
     */
    "PUT /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}/dismissals": Operation<"/repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}/dismissals", "put">;
    /**
     * @see https://docs.github.com/rest/pulls/pulls#update-a-pull-request-branch
     */
    "PUT /repos/{owner}/{repo}/pulls/{pull_number}/update-branch": Operation<"/repos/{owner}/{repo}/pulls/{pull_number}/update-branch", "put">;
    /**
     * @see https://docs.github.com/rest/repos/rules#update-a-repository-ruleset
     */
    "PUT /repos/{owner}/{repo}/rulesets/{ruleset_id}": Operation<"/repos/{owner}/{repo}/rulesets/{ruleset_id}", "put">;
    /**
     * @see https://docs.github.com/rest/activity/watching#set-a-repository-subscription
     */
    "PUT /repos/{owner}/{repo}/subscription": Operation<"/repos/{owner}/{repo}/subscription", "put">;
    /**
     * @see https://docs.github.com/rest/repos/repos#replace-all-repository-topics
     */
    "PUT /repos/{owner}/{repo}/topics": Operation<"/repos/{owner}/{repo}/topics", "put">;
    /**
     * @see https://docs.github.com/rest/repos/repos#enable-vulnerability-alerts
     */
    "PUT /repos/{owner}/{repo}/vulnerability-alerts": Operation<"/repos/{owner}/{repo}/vulnerability-alerts", "put">;
    /**
     * @see https://docs.github.com/rest/teams/members#add-team-member-legacy
     */
    "PUT /teams/{team_id}/members/{username}": Operation<"/teams/{team_id}/members/{username}", "put">;
    /**
     * @see https://docs.github.com/rest/teams/members#add-or-update-team-membership-for-a-user-legacy
     */
    "PUT /teams/{team_id}/memberships/{username}": Operation<"/teams/{team_id}/memberships/{username}", "put">;
    /**
     * @see https://docs.github.com/rest/teams/teams#add-or-update-team-project-permissions-legacy
     */
    "PUT /teams/{team_id}/projects/{project_id}": Operation<"/teams/{team_id}/projects/{project_id}", "put">;
    /**
     * @see https://docs.github.com/rest/teams/teams#add-or-update-team-repository-permissions-legacy
     */
    "PUT /teams/{team_id}/repos/{owner}/{repo}": Operation<"/teams/{team_id}/repos/{owner}/{repo}", "put">;
    /**
     * @see https://docs.github.com/rest/users/blocking#block-a-user
     */
    "PUT /user/blocks/{username}": Operation<"/user/blocks/{username}", "put">;
    /**
     * @see https://docs.github.com/rest/codespaces/secrets#create-or-update-a-secret-for-the-authenticated-user
     */
    "PUT /user/codespaces/secrets/{secret_name}": Operation<"/user/codespaces/secrets/{secret_name}", "put">;
    /**
     * @see https://docs.github.com/rest/codespaces/secrets#set-selected-repositories-for-a-user-secret
     */
    "PUT /user/codespaces/secrets/{secret_name}/repositories": Operation<"/user/codespaces/secrets/{secret_name}/repositories", "put">;
    /**
     * @see https://docs.github.com/rest/codespaces/secrets#add-a-selected-repository-to-a-user-secret
     */
    "PUT /user/codespaces/secrets/{secret_name}/repositories/{repository_id}": Operation<"/user/codespaces/secrets/{secret_name}/repositories/{repository_id}", "put">;
    /**
     * @see https://docs.github.com/rest/users/followers#follow-a-user
     */
    "PUT /user/following/{username}": Operation<"/user/following/{username}", "put">;
    /**
     * @see https://docs.github.com/rest/apps/installations#add-a-repository-to-an-app-installation
     */
    "PUT /user/installations/{installation_id}/repositories/{repository_id}": Operation<"/user/installations/{installation_id}/repositories/{repository_id}", "put">;
    /**
     * @see https://docs.github.com/rest/interactions/user#set-interaction-restrictions-for-your-public-repositories
     */
    "PUT /user/interaction-limits": Operation<"/user/interaction-limits", "put">;
    /**
     * @see https://docs.github.com/rest/activity/starring#star-a-repository-for-the-authenticated-user
     */
    "PUT /user/starred/{owner}/{repo}": Operation<"/user/starred/{owner}/{repo}", "put">;
}
export {};
