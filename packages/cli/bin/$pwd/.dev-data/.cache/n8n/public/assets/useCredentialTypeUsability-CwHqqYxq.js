import { Dp as SCOPE_LABEL_KEY, Gl as isCredentialTypeSupported, Mp as useCredentialsStore, iA as HTTP_REQUEST_NODE_TYPE, jN as useI18n, op as getCredentialTypeRestriction, sp as getNodeTypeRestriction, uf as useNodeTypesStore } from "./app-D5flEmb-.js";
//#region src/features/credentials/composables/useCredentialTypeUsability.ts
var HTTP_REQUEST_CREDENTIAL_TYPES = [
	"extends:oAuth2Api",
	"extends:oAuth1Api",
	"has:authenticate"
];
var CREDENTIAL_TYPE_USABILITY_REASONS = ["typeRestricted", "nodesRestricted"];
function parseCredentialTypeUsabilityReasons(values) {
	const given = [values].flat().flatMap((value) => typeof value === "string" ? value.split(",") : []);
	return CREDENTIAL_TYPE_USABILITY_REASONS.filter((reason) => given.includes(reason));
}
function isUsableByHttpRequest(credentialType, getCredentialType) {
	return isCredentialTypeSupported(credentialType, HTTP_REQUEST_CREDENTIAL_TYPES, HTTP_REQUEST_NODE_TYPE, getCredentialType);
}
/**
* Why no workflow in the loaded project can use a credential type: a policy blocks the type,
* or blocks every node that could use it, HTTP Request included. The credentials list gets the
* same answer from the server for each credential's home project, see `fromCredentialRestriction`.
*/
function useCredentialTypeUsability() {
	const credentialsStore = useCredentialsStore();
	const nodeTypesStore = useNodeTypesStore();
	const i18n = useI18n();
	function getNodesRestriction(credentialType) {
		const nodeTypes = credentialType.supportedNodes ?? [];
		if (nodeTypes.length === 0) return null;
		const restrictions = [];
		for (const nodeType of nodeTypes) {
			const restriction = getNodeTypeRestriction(nodeType);
			if (!restriction) return null;
			restrictions.push(restriction);
		}
		const getCredentialType = (name) => credentialsStore.getCredentialTypeByName(name) ?? void 0;
		if (isUsableByHttpRequest(credentialType, getCredentialType) && !getNodeTypeRestriction("n8n-nodes-base.httpRequest")) return null;
		const nodeTypeNames = toNodeTypeNames(nodeTypes);
		return {
			reason: "nodesRestricted",
			restriction: restrictions.find((verdict) => verdict.scope === "project" || verdict.optInAvailable) ?? restrictions[0],
			nodeTypeNames
		};
	}
	function toNodeTypeNames(nodeTypes) {
		return [...new Set(nodeTypes.map((nodeType) => nodeTypesStore.getNodeType(nodeType)?.displayName ?? nodeType))];
	}
	function getCredentialTypeUsability(credentialTypeName) {
		const restriction = getCredentialTypeRestriction(credentialTypeName);
		if (restriction) return {
			reason: "typeRestricted",
			restriction
		};
		const credentialType = credentialsStore.getCredentialTypeByName(credentialTypeName);
		return credentialType ? getNodesRestriction(credentialType) : null;
	}
	/** The server's answer for a listed credential, with the node display names the copy needs. */
	function fromCredentialRestriction(restriction) {
		if (restriction.reason === "typeRestricted") return restriction;
		return {
			reason: "nodesRestricted",
			restriction: restriction.restriction,
			nodeTypeNames: toNodeTypeNames(restriction.nodeTypes)
		};
	}
	function describeCredentialTypeUsability(usability, credentialTypeDisplayName) {
		if (usability.reason === "typeRestricted") {
			const { scope } = usability.restriction;
			return {
				blocked: true,
				kind: "credential",
				restriction: usability.restriction,
				scopeLabel: i18n.baseText(scope ? SCOPE_LABEL_KEY[scope] : "typeAvailabilityPolicies.restrictedNodes.scope.generic"),
				contactSubject: credentialTypeDisplayName
			};
		}
		const scopeLabel = i18n.baseText("typeAvailabilityPolicies.restrictedCredentialType.nodesRestricted.scope");
		return {
			blocked: false,
			kind: "node",
			restriction: usability.restriction,
			scopeLabel,
			popoverScopeLabel: scopeLabel,
			description: i18n.baseText("typeAvailabilityPolicies.restrictedCredentialType.nodesRestricted.description", { interpolate: { nodeTypes: usability.nodeTypeNames.join(", ") } }),
			contactSubject: usability.nodeTypeNames.join(", ")
		};
	}
	return {
		getCredentialTypeUsability,
		fromCredentialRestriction,
		describeCredentialTypeUsability
	};
}
//#endregion
export { parseCredentialTypeUsabilityReasons as n, useCredentialTypeUsability as r, CREDENTIAL_TYPE_USABILITY_REASONS as t };
