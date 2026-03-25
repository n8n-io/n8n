"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegionalAuthority = void 0;
exports.calculateRegionalAuthority = calculateRegionalAuthority;
/**
 * Helps specify a regional authority, or "AutoDiscoverRegion" to auto-detect the region.
 */
var RegionalAuthority;
(function (RegionalAuthority) {
    /** Instructs MSAL to attempt to discover the region */
    RegionalAuthority["AutoDiscoverRegion"] = "AutoDiscoverRegion";
    /** Uses the {@link RegionalAuthority} for the Azure 'westus' region. */
    RegionalAuthority["USWest"] = "westus";
    /** Uses the {@link RegionalAuthority} for the Azure 'westus2' region. */
    RegionalAuthority["USWest2"] = "westus2";
    /** Uses the {@link RegionalAuthority} for the Azure 'centralus' region. */
    RegionalAuthority["USCentral"] = "centralus";
    /** Uses the {@link RegionalAuthority} for the Azure 'eastus' region. */
    RegionalAuthority["USEast"] = "eastus";
    /** Uses the {@link RegionalAuthority} for the Azure 'eastus2' region. */
    RegionalAuthority["USEast2"] = "eastus2";
    /** Uses the {@link RegionalAuthority} for the Azure 'northcentralus' region. */
    RegionalAuthority["USNorthCentral"] = "northcentralus";
    /** Uses the {@link RegionalAuthority} for the Azure 'southcentralus' region. */
    RegionalAuthority["USSouthCentral"] = "southcentralus";
    /** Uses the {@link RegionalAuthority} for the Azure 'westcentralus' region. */
    RegionalAuthority["USWestCentral"] = "westcentralus";
    /** Uses the {@link RegionalAuthority} for the Azure 'canadacentral' region. */
    RegionalAuthority["CanadaCentral"] = "canadacentral";
    /** Uses the {@link RegionalAuthority} for the Azure 'canadaeast' region. */
    RegionalAuthority["CanadaEast"] = "canadaeast";
    /** Uses the {@link RegionalAuthority} for the Azure 'brazilsouth' region. */
    RegionalAuthority["BrazilSouth"] = "brazilsouth";
    /** Uses the {@link RegionalAuthority} for the Azure 'northeurope' region. */
    RegionalAuthority["EuropeNorth"] = "northeurope";
    /** Uses the {@link RegionalAuthority} for the Azure 'westeurope' region. */
    RegionalAuthority["EuropeWest"] = "westeurope";
    /** Uses the {@link RegionalAuthority} for the Azure 'uksouth' region. */
    RegionalAuthority["UKSouth"] = "uksouth";
    /** Uses the {@link RegionalAuthority} for the Azure 'ukwest' region. */
    RegionalAuthority["UKWest"] = "ukwest";
    /** Uses the {@link RegionalAuthority} for the Azure 'francecentral' region. */
    RegionalAuthority["FranceCentral"] = "francecentral";
    /** Uses the {@link RegionalAuthority} for the Azure 'francesouth' region. */
    RegionalAuthority["FranceSouth"] = "francesouth";
    /** Uses the {@link RegionalAuthority} for the Azure 'switzerlandnorth' region. */
    RegionalAuthority["SwitzerlandNorth"] = "switzerlandnorth";
    /** Uses the {@link RegionalAuthority} for the Azure 'switzerlandwest' region. */
    RegionalAuthority["SwitzerlandWest"] = "switzerlandwest";
    /** Uses the {@link RegionalAuthority} for the Azure 'germanynorth' region. */
    RegionalAuthority["GermanyNorth"] = "germanynorth";
    /** Uses the {@link RegionalAuthority} for the Azure 'germanywestcentral' region. */
    RegionalAuthority["GermanyWestCentral"] = "germanywestcentral";
    /** Uses the {@link RegionalAuthority} for the Azure 'norwaywest' region. */
    RegionalAuthority["NorwayWest"] = "norwaywest";
    /** Uses the {@link RegionalAuthority} for the Azure 'norwayeast' region. */
    RegionalAuthority["NorwayEast"] = "norwayeast";
    /** Uses the {@link RegionalAuthority} for the Azure 'eastasia' region. */
    RegionalAuthority["AsiaEast"] = "eastasia";
    /** Uses the {@link RegionalAuthority} for the Azure 'southeastasia' region. */
    RegionalAuthority["AsiaSouthEast"] = "southeastasia";
    /** Uses the {@link RegionalAuthority} for the Azure 'japaneast' region. */
    RegionalAuthority["JapanEast"] = "japaneast";
    /** Uses the {@link RegionalAuthority} for the Azure 'japanwest' region. */
    RegionalAuthority["JapanWest"] = "japanwest";
    /** Uses the {@link RegionalAuthority} for the Azure 'australiaeast' region. */
    RegionalAuthority["AustraliaEast"] = "australiaeast";
    /** Uses the {@link RegionalAuthority} for the Azure 'australiasoutheast' region. */
    RegionalAuthority["AustraliaSouthEast"] = "australiasoutheast";
    /** Uses the {@link RegionalAuthority} for the Azure 'australiacentral' region. */
    RegionalAuthority["AustraliaCentral"] = "australiacentral";
    /** Uses the {@link RegionalAuthority} for the Azure 'australiacentral2' region. */
    RegionalAuthority["AustraliaCentral2"] = "australiacentral2";
    /** Uses the {@link RegionalAuthority} for the Azure 'centralindia' region. */
    RegionalAuthority["IndiaCentral"] = "centralindia";
    /** Uses the {@link RegionalAuthority} for the Azure 'southindia' region. */
    RegionalAuthority["IndiaSouth"] = "southindia";
    /** Uses the {@link RegionalAuthority} for the Azure 'westindia' region. */
    RegionalAuthority["IndiaWest"] = "westindia";
    /** Uses the {@link RegionalAuthority} for the Azure 'koreasouth' region. */
    RegionalAuthority["KoreaSouth"] = "koreasouth";
    /** Uses the {@link RegionalAuthority} for the Azure 'koreacentral' region. */
    RegionalAuthority["KoreaCentral"] = "koreacentral";
    /** Uses the {@link RegionalAuthority} for the Azure 'uaecentral' region. */
    RegionalAuthority["UAECentral"] = "uaecentral";
    /** Uses the {@link RegionalAuthority} for the Azure 'uaenorth' region. */
    RegionalAuthority["UAENorth"] = "uaenorth";
    /** Uses the {@link RegionalAuthority} for the Azure 'southafricanorth' region. */
    RegionalAuthority["SouthAfricaNorth"] = "southafricanorth";
    /** Uses the {@link RegionalAuthority} for the Azure 'southafricawest' region. */
    RegionalAuthority["SouthAfricaWest"] = "southafricawest";
    /** Uses the {@link RegionalAuthority} for the Azure 'chinanorth' region. */
    RegionalAuthority["ChinaNorth"] = "chinanorth";
    /** Uses the {@link RegionalAuthority} for the Azure 'chinaeast' region. */
    RegionalAuthority["ChinaEast"] = "chinaeast";
    /** Uses the {@link RegionalAuthority} for the Azure 'chinanorth2' region. */
    RegionalAuthority["ChinaNorth2"] = "chinanorth2";
    /** Uses the {@link RegionalAuthority} for the Azure 'chinaeast2' region. */
    RegionalAuthority["ChinaEast2"] = "chinaeast2";
    /** Uses the {@link RegionalAuthority} for the Azure 'germanycentral' region. */
    RegionalAuthority["GermanyCentral"] = "germanycentral";
    /** Uses the {@link RegionalAuthority} for the Azure 'germanynortheast' region. */
    RegionalAuthority["GermanyNorthEast"] = "germanynortheast";
    /** Uses the {@link RegionalAuthority} for the Azure 'usgovvirginia' region. */
    RegionalAuthority["GovernmentUSVirginia"] = "usgovvirginia";
    /** Uses the {@link RegionalAuthority} for the Azure 'usgoviowa' region. */
    RegionalAuthority["GovernmentUSIowa"] = "usgoviowa";
    /** Uses the {@link RegionalAuthority} for the Azure 'usgovarizona' region. */
    RegionalAuthority["GovernmentUSArizona"] = "usgovarizona";
    /** Uses the {@link RegionalAuthority} for the Azure 'usgovtexas' region. */
    RegionalAuthority["GovernmentUSTexas"] = "usgovtexas";
    /** Uses the {@link RegionalAuthority} for the Azure 'usdodeast' region. */
    RegionalAuthority["GovernmentUSDodEast"] = "usdodeast";
    /** Uses the {@link RegionalAuthority} for the Azure 'usdodcentral' region. */
    RegionalAuthority["GovernmentUSDodCentral"] = "usdodcentral";
})(RegionalAuthority || (exports.RegionalAuthority = RegionalAuthority = {}));
/**
 * Calculates the correct regional authority based on the supplied value
 * and the AZURE_REGIONAL_AUTHORITY_NAME environment variable.
 *
 * Values will be returned verbatim, except for {@link RegionalAuthority.AutoDiscoverRegion}
 * which is mapped to a value MSAL can understand.
 *
 * @internal
 */
function calculateRegionalAuthority(regionalAuthority) {
    // Note: as of today only 3 credentials support regional authority, and the parameter
    // is not exposed via the public API. Regional Authority is _only_ supported
    // via the AZURE_REGIONAL_AUTHORITY_NAME env var and _only_ for: ClientSecretCredential, ClientCertificateCredential, and ClientAssertionCredential.
    // Accepting the regionalAuthority parameter will allow us to support it in the future.
    let azureRegion = regionalAuthority;
    if (azureRegion === undefined &&
        globalThis.process?.env?.AZURE_REGIONAL_AUTHORITY_NAME !== undefined) {
        azureRegion = process.env.AZURE_REGIONAL_AUTHORITY_NAME;
    }
    if (azureRegion === RegionalAuthority.AutoDiscoverRegion) {
        return "AUTO_DISCOVER";
    }
    return azureRegion;
}
//# sourceMappingURL=regionalAuthority.js.map