export const resolveAuthOptions = (candidateAuthOptions, authSchemePreference) => {
    if (!authSchemePreference || authSchemePreference.length === 0) {
        return candidateAuthOptions;
    }
    const preferredAuthOptions = [];
    for (const preferredSchemeName of authSchemePreference) {
        for (const candidateAuthOption of candidateAuthOptions) {
            const candidateAuthSchemeName = candidateAuthOption.schemeId.split("#")[1];
            if (candidateAuthSchemeName === preferredSchemeName) {
                preferredAuthOptions.push(candidateAuthOption);
            }
        }
    }
    for (const candidateAuthOption of candidateAuthOptions) {
        if (!preferredAuthOptions.find(({ schemeId }) => schemeId === candidateAuthOption.schemeId)) {
            preferredAuthOptions.push(candidateAuthOption);
        }
    }
    return preferredAuthOptions;
};
