// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { logger } from "./logger.js";
import { isComplexField, } from "./serviceModels.js";
export const defaultServiceVersion = "2025-09-01";
const knownSkills = {
    "#Microsoft.Skills.Custom.WebApiSkill": true,
    "#Microsoft.Skills.Text.AzureOpenAIEmbeddingSkill": true,
    "#Microsoft.Skills.Text.CustomEntityLookupSkill": true,
    "#Microsoft.Skills.Text.EntityRecognitionSkill": true,
    "#Microsoft.Skills.Text.KeyPhraseExtractionSkill": true,
    "#Microsoft.Skills.Text.LanguageDetectionSkill": true,
    "#Microsoft.Skills.Text.MergeSkill": true,
    "#Microsoft.Skills.Text.PIIDetectionSkill": true,
    "#Microsoft.Skills.Text.SentimentSkill": true,
    "#Microsoft.Skills.Text.SplitSkill": true,
    "#Microsoft.Skills.Text.TranslationSkill": true,
    "#Microsoft.Skills.Text.V3.EntityLinkingSkill": true,
    "#Microsoft.Skills.Text.V3.EntityRecognitionSkill": true,
    "#Microsoft.Skills.Text.V3.SentimentSkill": true,
    "#Microsoft.Skills.Util.ConditionalSkill": true,
    "#Microsoft.Skills.Util.DocumentExtractionSkill": true,
    "#Microsoft.Skills.Util.ShaperSkill": true,
    "#Microsoft.Skills.Vision.ImageAnalysisSkill": true,
    "#Microsoft.Skills.Vision.OcrSkill": true,
    "#Microsoft.Skills.Util.DocumentIntelligenceLayoutSkill": true,
};
export function convertSkillsToPublic(skills) {
    if (!skills) {
        return skills;
    }
    // This validation has already GAed
    return skills.filter((skill) => knownSkills[skill.odatatype]);
}
export function convertCognitiveServicesAccountToGenerated(cognitiveServicesAccount) {
    if (!cognitiveServicesAccount) {
        return cognitiveServicesAccount;
    }
    return cognitiveServicesAccount;
}
export function convertCognitiveServicesAccountToPublic(cognitiveServicesAccount) {
    if (!cognitiveServicesAccount) {
        return cognitiveServicesAccount;
    }
    if (cognitiveServicesAccount.odatatype === "#Microsoft.Azure.Search.DefaultCognitiveServices") {
        return cognitiveServicesAccount;
    }
    else {
        return cognitiveServicesAccount;
    }
}
export function convertTokenFiltersToGenerated(tokenFilters) {
    if (!tokenFilters) {
        return tokenFilters;
    }
    const result = [];
    for (const filter of tokenFilters) {
        result.push(filter);
    }
    return result;
}
function convertAnalyzersToGenerated(analyzers) {
    if (!analyzers) {
        return analyzers;
    }
    const result = [];
    for (const analyzer of analyzers) {
        switch (analyzer.odatatype) {
            case "#Microsoft.Azure.Search.StandardAnalyzer":
            case "#Microsoft.Azure.Search.StopAnalyzer":
                result.push(analyzer);
                break;
            case "#Microsoft.Azure.Search.PatternAnalyzer":
                result.push({
                    ...analyzer,
                    flags: analyzer.flags ? analyzer.flags.join("|") : undefined,
                });
                break;
            case "#Microsoft.Azure.Search.CustomAnalyzer":
                result.push({
                    ...analyzer,
                    tokenizerName: analyzer.tokenizerName,
                });
                break;
        }
    }
    return result;
}
function convertAnalyzersToPublic(analyzers) {
    if (!analyzers) {
        return analyzers;
    }
    const result = [];
    for (const analyzer of analyzers) {
        switch (analyzer.odatatype) {
            case "#Microsoft.Azure.Search.StandardAnalyzer":
                result.push(analyzer);
                break;
            case "#Microsoft.Azure.Search.StopAnalyzer":
                result.push(analyzer);
                break;
            case "#Microsoft.Azure.Search.PatternAnalyzer":
                result.push({
                    ...analyzer,
                    flags: analyzer.flags
                        ? analyzer.flags.split("|")
                        : undefined,
                });
                break;
            case "#Microsoft.Azure.Search.CustomAnalyzer":
                result.push(analyzer);
                break;
        }
    }
    return result;
}
export function convertFieldsToPublic(fields) {
    if (!fields) {
        return fields;
    }
    return fields.map((field) => {
        if (field.type === "Collection(Edm.ComplexType)" || field.type === "Edm.ComplexType") {
            const result = {
                name: field.name,
                type: field.type,
                fields: convertFieldsToPublic(field.fields),
            };
            return result;
        }
        else {
            const type = field.type;
            const synonymMapNames = field.synonymMaps;
            const { retrievable, analyzer, searchAnalyzer, indexAnalyzer, normalizer, ...restField } = field;
            const hidden = typeof retrievable === "boolean" ? !retrievable : retrievable;
            const result = {
                ...restField,
                type,
                hidden,
                analyzerName: analyzer,
                normalizerName: normalizer,
                searchAnalyzerName: searchAnalyzer,
                indexAnalyzerName: indexAnalyzer,
                synonymMapNames,
            };
            return result;
        }
    });
}
export function convertFieldsToGenerated(fields) {
    return fields.map((field) => {
        if (isComplexField(field)) {
            return {
                name: field.name,
                type: field.type,
                fields: field.fields ? convertFieldsToGenerated(field.fields) : field.fields,
            };
        }
        else {
            const { hidden, ...restField } = field;
            const retrievable = typeof hidden === "boolean" ? !hidden : hidden;
            return {
                ...restField,
                retrievable,
                // modify API defaults to use less storage for simple types
                searchable: field.searchable ?? false,
                filterable: field.filterable ?? false,
                facetable: field.facetable ?? false,
                sortable: field.sortable ?? false,
                analyzer: field.analyzerName,
                normalizer: field.normalizerName,
                searchAnalyzer: field.searchAnalyzerName,
                indexAnalyzer: field.indexAnalyzerName,
                synonymMaps: field.synonymMapNames,
            };
        }
    });
}
function convertTokenizersToGenerated(tokenizers) {
    if (!tokenizers) {
        return tokenizers;
    }
    const result = [];
    for (const tokenizer of tokenizers) {
        if (tokenizer.odatatype === "#Microsoft.Azure.Search.PatternTokenizer") {
            result.push({
                ...tokenizer,
                flags: tokenizer.flags ? tokenizer.flags.join("|") : undefined,
            });
        }
        else {
            result.push(tokenizer);
        }
    }
    return result;
}
function convertTokenizersToPublic(tokenizers) {
    if (!tokenizers) {
        return tokenizers;
    }
    const result = [];
    for (const tokenizer of tokenizers) {
        if (tokenizer.odatatype === "#Microsoft.Azure.Search.PatternTokenizer") {
            const patternTokenizer = tokenizer;
            const flags = patternTokenizer.flags?.split("|");
            result.push({
                ...tokenizer,
                flags,
            });
        }
        else {
            result.push(tokenizer);
        }
    }
    return result;
}
export function convertSimilarityToGenerated(similarity) {
    if (!similarity) {
        return similarity;
    }
    return similarity;
}
export function convertSimilarityToPublic(similarity) {
    if (!similarity) {
        return similarity;
    }
    if (similarity.odatatype === "#Microsoft.Azure.Search.ClassicSimilarity") {
        return similarity;
    }
    else {
        return similarity;
    }
}
function convertEncryptionKeyToPublic(encryptionKey) {
    if (!encryptionKey) {
        return encryptionKey;
    }
    const result = {
        keyName: encryptionKey.keyName,
        keyVersion: encryptionKey.keyVersion,
        vaultUrl: encryptionKey.vaultUri,
    };
    if (encryptionKey.accessCredentials) {
        result.applicationId = encryptionKey.accessCredentials.applicationId;
        result.applicationSecret = encryptionKey.accessCredentials.applicationSecret;
    }
    return result;
}
function convertEncryptionKeyToGenerated(encryptionKey) {
    if (!encryptionKey) {
        return encryptionKey;
    }
    const result = {
        keyName: encryptionKey.keyName,
        keyVersion: encryptionKey.keyVersion,
        vaultUri: encryptionKey.vaultUrl,
    };
    if (encryptionKey.applicationId) {
        result.accessCredentials = {
            applicationId: encryptionKey.applicationId,
            applicationSecret: encryptionKey.applicationSecret,
        };
    }
    return result;
}
export function generatedIndexToPublicIndex(generatedIndex) {
    return {
        name: generatedIndex.name,
        description: generatedIndex.description,
        defaultScoringProfile: generatedIndex.defaultScoringProfile,
        corsOptions: generatedIndex.corsOptions,
        suggesters: generatedIndex.suggesters,
        encryptionKey: convertEncryptionKeyToPublic(generatedIndex.encryptionKey),
        etag: generatedIndex.etag,
        analyzers: convertAnalyzersToPublic(generatedIndex.analyzers),
        tokenizers: convertTokenizersToPublic(generatedIndex.tokenizers),
        tokenFilters: generatedIndex.tokenFilters,
        normalizers: generatedIndex.normalizers,
        charFilters: generatedIndex.charFilters,
        scoringProfiles: generatedIndex.scoringProfiles,
        fields: convertFieldsToPublic(generatedIndex.fields),
        similarity: convertSimilarityToPublic(generatedIndex.similarity),
        semanticSearch: generatedIndex.semanticSearch,
        vectorSearch: generatedVectorSearchToPublicVectorSearch(generatedIndex.vectorSearch),
    };
}
export function generatedVectorSearchVectorizerToPublicVectorizer(generatedVectorizer) {
    if (!generatedVectorizer) {
        return generatedVectorizer;
    }
    switch (generatedVectorizer.kind) {
        case "azureOpenAI": {
            const { parameters } = generatedVectorizer;
            const authIdentity = convertSearchIndexerDataIdentityToPublic(parameters?.authIdentity);
            const vectorizer = {
                ...generatedVectorizer,
                parameters: { ...parameters, authIdentity },
            };
            return vectorizer;
        }
        case "customWebApi": {
            const { parameters } = generatedVectorizer;
            const authIdentity = convertSearchIndexerDataIdentityToPublic(parameters?.authIdentity);
            const vectorizer = {
                ...generatedVectorizer,
                parameters: { ...parameters, authIdentity },
            };
            return vectorizer;
        }
    }
    logger.warning(`Unsupported vectorizer kind: ${generatedVectorizer.kind}`);
    return generatedVectorizer;
}
export function generatedVectorSearchAlgorithmConfigurationToPublicVectorSearchAlgorithmConfiguration(generatedAlgorithmConfiguration) {
    if (!generatedAlgorithmConfiguration) {
        return generatedAlgorithmConfiguration;
    }
    if (["hnsw", "exhaustiveKnn"].includes(generatedAlgorithmConfiguration.kind)) {
        const algorithmConfiguration = generatedAlgorithmConfiguration;
        const metric = algorithmConfiguration.parameters?.metric;
        return {
            ...algorithmConfiguration,
            parameters: { ...algorithmConfiguration.parameters, metric },
        };
    }
    throw Error("Unsupported algorithm configuration");
}
export function generatedVectorSearchToPublicVectorSearch(vectorSearch) {
    if (!vectorSearch) {
        return vectorSearch;
    }
    return {
        ...vectorSearch,
        algorithms: vectorSearch.algorithms?.map(generatedVectorSearchAlgorithmConfigurationToPublicVectorSearchAlgorithmConfiguration),
        vectorizers: vectorSearch.vectorizers?.map(generatedVectorSearchVectorizerToPublicVectorizer),
    };
}
export function generatedSearchResultToPublicSearchResult(results) {
    const returnValues = results.map((result) => {
        const { _score: score, _highlights: highlights, _rerankerScore: rerankerScore, _captions: captions, rerankerBoostedScore, ...restProps } = result;
        const obj = {
            score,
            highlights,
            rerankerScore,
            rerankerBoostedScore,
            captions,
            document: restProps,
        };
        return obj;
    });
    return returnValues;
}
export function generatedSuggestDocumentsResultToPublicSuggestDocumentsResult(searchDocumentsResult) {
    const results = searchDocumentsResult.results.map((element) => {
        const { _text, ...restProps } = element;
        const obj = {
            text: _text,
            document: restProps,
        };
        return obj;
    });
    const result = {
        results: results,
        coverage: searchDocumentsResult.coverage,
    };
    return result;
}
export function publicIndexToGeneratedIndex(index) {
    const { encryptionKey, tokenFilters, analyzers, tokenizers, fields, similarity } = index;
    return {
        ...index,
        encryptionKey: convertEncryptionKeyToGenerated(encryptionKey),
        tokenFilters: convertTokenFiltersToGenerated(tokenFilters),
        analyzers: convertAnalyzersToGenerated(analyzers),
        tokenizers: convertTokenizersToGenerated(tokenizers),
        fields: convertFieldsToGenerated(fields),
        similarity: convertSimilarityToGenerated(similarity),
    };
}
export function generatedSkillsetToPublicSkillset(generatedSkillset) {
    const { skills, cognitiveServicesAccount, encryptionKey, indexProjection, ...props } = generatedSkillset;
    return {
        ...props,
        skills: convertSkillsToPublic(skills),
        cognitiveServicesAccount: convertCognitiveServicesAccountToPublic(cognitiveServicesAccount),
        encryptionKey: convertEncryptionKeyToPublic(encryptionKey),
        indexProjection: indexProjection,
    };
}
export function publicSkillsetToGeneratedSkillset(skillset) {
    return {
        ...skillset,
        name: skillset.name,
        description: skillset.description,
        etag: skillset.etag,
        skills: skillset.skills,
        cognitiveServicesAccount: convertCognitiveServicesAccountToGenerated(skillset.cognitiveServicesAccount),
        knowledgeStore: skillset.knowledgeStore,
        encryptionKey: convertEncryptionKeyToGenerated(skillset.encryptionKey),
    };
}
export function generatedSynonymMapToPublicSynonymMap(synonymMap) {
    const result = {
        name: synonymMap.name,
        encryptionKey: convertEncryptionKeyToPublic(synonymMap.encryptionKey),
        etag: synonymMap.etag,
        synonyms: [],
    };
    if (synonymMap.synonyms) {
        result.synonyms = synonymMap.synonyms.split("\n");
    }
    return result;
}
export function publicSynonymMapToGeneratedSynonymMap(synonymMap) {
    const result = {
        name: synonymMap.name,
        format: "solr",
        encryptionKey: convertEncryptionKeyToGenerated(synonymMap.encryptionKey),
        etag: synonymMap.etag,
        synonyms: synonymMap.synonyms.join("\n"),
    };
    result.encryptionKey = convertEncryptionKeyToGenerated(synonymMap.encryptionKey);
    return result;
}
export function publicSearchIndexerToGeneratedSearchIndexer(indexer) {
    return {
        ...indexer,
        encryptionKey: convertEncryptionKeyToGenerated(indexer.encryptionKey),
    };
}
export function generatedSearchIndexerToPublicSearchIndexer(indexer) {
    const { parsingMode, dataToExtract, imageAction, pdfTextRotationAlgorithm, executionEnvironment, } = indexer.parameters?.configuration ?? {};
    const configuration = indexer.parameters
        ?.configuration && {
        ...indexer.parameters?.configuration,
        parsingMode: parsingMode,
        dataToExtract: dataToExtract,
        imageAction: imageAction,
        pdfTextRotationAlgorithm: pdfTextRotationAlgorithm,
        executionEnvironment: executionEnvironment,
    };
    const parameters = {
        ...indexer.parameters,
        configuration,
    };
    return {
        ...indexer,
        parameters,
        encryptionKey: convertEncryptionKeyToPublic(indexer.encryptionKey),
    };
}
export function publicDataSourceToGeneratedDataSource(dataSource) {
    return {
        name: dataSource.name,
        description: dataSource.description,
        type: dataSource.type,
        credentials: {
            connectionString: dataSource.connectionString,
        },
        container: dataSource.container,
        etag: dataSource.etag,
        dataChangeDetectionPolicy: dataSource.dataChangeDetectionPolicy,
        dataDeletionDetectionPolicy: dataSource.dataDeletionDetectionPolicy,
        encryptionKey: convertEncryptionKeyToGenerated(dataSource.encryptionKey),
    };
}
export function generatedDataSourceToPublicDataSource(dataSource) {
    return {
        name: dataSource.name,
        description: dataSource.name,
        type: dataSource.type,
        connectionString: dataSource.credentials.connectionString,
        container: dataSource.container,
        etag: dataSource.etag,
        dataChangeDetectionPolicy: convertDataChangeDetectionPolicyToPublic(dataSource.dataChangeDetectionPolicy),
        dataDeletionDetectionPolicy: convertDataDeletionDetectionPolicyToPublic(dataSource.dataDeletionDetectionPolicy),
        encryptionKey: convertEncryptionKeyToPublic(dataSource.encryptionKey),
    };
}
export function convertSearchIndexerDataIdentityToPublic(searchIndexerDataIdentity) {
    if (!searchIndexerDataIdentity) {
        return searchIndexerDataIdentity;
    }
    if (searchIndexerDataIdentity.odatatype === "#Microsoft.Azure.Search.DataNoneIdentity") {
        return searchIndexerDataIdentity;
    }
    else {
        return searchIndexerDataIdentity;
    }
}
export function convertDataChangeDetectionPolicyToPublic(dataChangeDetectionPolicy) {
    if (!dataChangeDetectionPolicy) {
        return dataChangeDetectionPolicy;
    }
    if (dataChangeDetectionPolicy.odatatype ===
        "#Microsoft.Azure.Search.HighWaterMarkChangeDetectionPolicy") {
        return dataChangeDetectionPolicy;
    }
    else {
        return dataChangeDetectionPolicy;
    }
}
export function convertDataDeletionDetectionPolicyToPublic(dataDeletionDetectionPolicy) {
    if (!dataDeletionDetectionPolicy) {
        return dataDeletionDetectionPolicy;
    }
    return dataDeletionDetectionPolicy;
}
export function getRandomIntegerInclusive(min, max) {
    // Make sure inputs are integers.
    min = Math.ceil(min);
    max = Math.floor(max);
    // Pick a random offset from zero to the size of the range.
    // Since Math.random() can never return 1, we have to make the range one larger
    // in order to be inclusive of the maximum value after we take the floor.
    const offset = Math.floor(Math.random() * (max - min + 1));
    return offset + min;
}
//# sourceMappingURL=serviceUtils.js.map