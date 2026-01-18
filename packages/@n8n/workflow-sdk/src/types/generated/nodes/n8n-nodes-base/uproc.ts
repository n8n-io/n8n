/**
 * uProc Node Types
 *
 * Consume uProc API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/uproc/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface UprocV1Params {
	group?:
		| 'audio'
		| 'communication'
		| 'company'
		| 'finance'
		| 'geographic'
		| 'image'
		| 'internet'
		| 'personal'
		| 'product'
		| 'security'
		| 'text'
		| Expression<string>;
	/**
	 * The Operation to consume
	 * @displayOptions.show { group: ["audio"] }
	 * @default getAudioAdvancedSpeechByText
	 */
	tool?: 'getAudioAdvancedSpeechByText' | 'getAudioSpeechByText' | Expression<string>;
	/**
	 * The "Credit card" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["finance", "finance"], tool: ["checkCreditcardChecksum", "getCreditcardType"] }
	 */
	credit_card: string | Expression<string>;
	/**
	 * The "Address" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["geographic", "geographic", "geographic", "geographic", "geographic", "geographic", "geographic", "finance", "geographic", "finance"], tool: ["getAddressBySearch", "getCoordinateBySearch", "checkAddressExist", "getAddressNormalized", "checkAddressNumberExist", "getAddressSplitted", "getAddressSplittedBest", "checkCryptoWalletAddressValid", "getTimeByAddress", "getVatByAddress"] }
	 */
	address: string | Expression<string>;
	/**
	 * The "Country" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["geographic", "geographic", "company", "company", "company", "company", "company", "company", "geographic", "geographic", "geographic", "geographic", "finance", "finance", "communication", "communication", "communication", "communication", "communication", "communication", "communication", "communication"], tool: ["checkAddressExist", "checkAddressNumberExist", "getCompanyByName", "getCompanyFinancialByDomain", "getCompanyFinancialByDuns", "getCompanyFinancialByName", "getCompanyFinancialByTaxid", "getPersonListByParams", "getCountryByName", "getCountryCodeByName", "getCountryListByName", "getCountryNormalized", "getCurrencyByCountry", "getCurrencyListByCountry", "getMobileCountryPrefix", "checkMobileFormat", "getMobileFormatted", "getMobileNormalized", "getPhoneFixed", "checkPhoneFormat", "getPhoneNormalized", "checkPhoneOrMobileValid"] }
	 */
	country?: string | Expression<string>;
	/**
	 * The "Coordinates" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["geographic", "geographic", "geographic", "geographic", "geographic", "geographic", "finance"], tool: ["checkCoordinateValid", "getCoordinateCartesian", "getCoordinateDecimal", "getCoordinateUsng", "getCoordinateUtm", "getLocationByCoordinates", "getVatByCoordinates"] }
	 */
	coordinates: string | Expression<string>;
	/**
	 * The "Date" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["personal", "personal", "personal", "personal", "personal", "personal", "personal", "personal", "personal", "personal", "personal", "personal", "finance", "personal", "personal", "personal", "personal"], tool: ["checkAgeBetw", "getAgeByDate", "checkAgeEq", "checkAgeGe", "checkAgeGt", "checkAgeIsAdult", "checkAgeIsForties", "checkAgeIsRetired", "checkAgeIsTwenties", "checkAgeLe", "checkAgeLt", "getAgeRange", "getCurrencyConvertedBetweenIsocodeDate", "checkDateLeap", "getDateNormalized", "getDateParsed", "checkDateValid"] }
	 */
	date: string | Expression<string>;
	/**
	 * The "Years1" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["personal"], tool: ["checkAgeBetw"] }
	 */
	years1: number | Expression<number>;
	/**
	 * The "Years2" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["personal"], tool: ["checkAgeBetw"] }
	 */
	years2: number | Expression<number>;
	/**
	 * The "Years" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["personal", "personal", "personal", "personal", "personal"], tool: ["checkAgeEq", "checkAgeGe", "checkAgeGt", "checkAgeLe", "checkAgeLt"] }
	 */
	years: number | Expression<number>;
	/**
	 * The "Ean" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["product", "product", "product", "product", "product", "product", "product", "product", "product", "product", "product"], tool: ["getAsinByEan", "checkEan13Valid", "checkGtin13Valid", "checkEan14Valid", "checkGtin14Valid", "checkEan18Valid", "checkEan8Valid", "checkGtin8Valid", "checkEanExist", "checkEanValid", "checkGtinValid"] }
	 */
	ean: string | Expression<string>;
	/**
	 * The "Asin" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["product", "product", "product"], tool: ["checkAsinExist", "checkAsinValid", "getEanByAsin"] }
	 */
	asin: string | Expression<string>;
	/**
	 * The "Text" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["audio", "audio", "image", "internet", "communication", "image", "image", "text", "text", "text", "text", "text", "text", "text", "text", "text", "text", "text", "text", "text", "text", "text", "text", "text", "text", "text", "text", "text", "text", "text", "text", "text", "text", "text", "text", "text", "text", "text", "text", "text", "text", "text", "text", "text", "text", "text", "text", "text", "text", "text", "text", "text", "text", "text"], tool: ["getAudioAdvancedSpeechByText", "getAudioSpeechByText", "getBarcodeEncoded", "getUrlShareableLinks", "sendMobileSms", "getImageWithText", "getQrEncoded", "checkListContains", "checkListEnds", "checkListStarts", "checkStringNumeric", "getSentimentByText", "checkStringAlpha", "checkStringAlphanumeric", "getStringBase64", "checkStringBlank", "checkStringBoolean", "getStringByFormat", "getStringFieldName", "getStringHtmlByMarkdown", "getStringLength", "checkStringLengthBetw", "checkStringLengthEq", "checkStringLengthGe", "checkStringLengthGt", "checkStringLengthLe", "checkStringLengthLt", "checkStringLowercase", "getStringLowercase", "getStringMarkdownByHtml", "getStringMd5", "getStringNormalized", "getStringParsed", "checkStringRandom", "checkStringRegex", "getStringReplaceAll", "getStringReplaceFirst", "getStringSha", "getStringSpin", "getStringSplit", "getStringSplitAndJoin", "getStringTranslated", "checkStringUppercase", "getStringUppercase", "getStringVlookup", "getWordBanned", "getWordCleanAbuse", "getWordCount", "checkWordCountBetw", "checkWordCountEq", "checkWordCountGe", "checkWordCountGt", "checkWordCountLe", "checkWordCountLt"] }
	 */
	text: string | Expression<string>;
	/**
	 * The "Gender" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["audio", "audio", "personal", "personal", "geographic"], tool: ["getAudioAdvancedSpeechByText", "getAudioSpeechByText", "checkGenderValid", "getNameByPrefix", "getNameListByPrefix"] }
	 */
	gender: 'female' | 'male' | Expression<string>;
	/**
	 * The "Language" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["audio", "audio", "geographic", "text"], tool: ["getAudioAdvancedSpeechByText", "getAudioSpeechByText", "getCountryNormalized", "getStringTranslated"] }
	 */
	language:
		| 'american'
		| 'arabic'
		| 'bengali'
		| 'british'
		| 'czech'
		| 'danish'
		| 'dutch'
		| 'filipino'
		| 'finnish'
		| 'french'
		| 'german'
		| 'greek'
		| 'gujurati'
		| 'hindi'
		| 'hungarian'
		| 'indonesian'
		| 'italian'
		| 'japanese'
		| 'kannada'
		| 'korean'
		| 'malayalam'
		| 'mandarin'
		| 'norwegian'
		| 'polish'
		| 'portuguese'
		| 'russian'
		| 'slovak'
		| 'spanish'
		| 'tamil'
		| 'telugu'
		| 'thai'
		| 'turkish'
		| 'ukranian'
		| 'vietnamese'
		| Expression<string>;
	/**
	 * The "Account" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["finance", "finance"], tool: ["checkBankAccountValidEs", "getBankIbanByAccount"] }
	 */
	account: string | Expression<string>;
	/**
	 * The "Bic" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["finance"], tool: ["checkBankBicValid"] }
	 */
	bic: string | Expression<string>;
	/**
	 * The "Isocode" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["finance", "geographic", "geographic", "geographic", "geographic", "geographic", "finance", "finance", "finance", "finance", "finance", "finance"], tool: ["getBankIbanByAccount", "getCountryByCode", "getCountryByCurrencyCode", "getCountryListByCode", "getCountryListByCurrencyCode", "checkCountryValidIso", "getCurrencyByIsocode", "getCurrencyListByIsocode", "checkCurrencyValidIso", "getVatByIsocode", "getVatByNumber", "checkVatExist"] }
	 */
	isocode: string | Expression<string>;
	/**
	 * The "Iban" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["finance", "finance"], tool: ["getBankIbanLookup", "checkBankIbanValid"] }
	 */
	iban: string | Expression<string>;
	/**
	 * The "Swift" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["finance"], tool: ["getSwiftLookup"] }
	 */
	swift: string | Expression<string>;
	/**
	 * The "Bcid" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["image"], tool: ["getBarcodeEncoded"] }
	 */
	bcid:
		| 'auspost'
		| 'azteccode'
		| 'azteccodecompact'
		| 'aztecrune'
		| 'bc412'
		| 'channelcode'
		| 'codablockf'
		| 'code11'
		| 'code128'
		| 'code16k'
		| 'code2of5'
		| 'code32'
		| 'code39'
		| 'code39ext'
		| 'code49'
		| 'code93'
		| 'code93ext'
		| 'codeone'
		| 'coop2of5'
		| 'daft'
		| 'databarexpanded'
		| 'databarexpandedcomposite'
		| 'databarexpandedstacked'
		| 'databarexpandedstackedcomposite'
		| 'databarlimited'
		| 'databarlimitedcomposite'
		| 'databaromni'
		| 'databaromnicomposite'
		| 'databarstacked'
		| 'databarstackedcomposite'
		| 'databarstackedomni'
		| 'databarstackedomnicomposite'
		| 'databartruncated'
		| 'databartruncatedcomposite'
		| 'datalogic2of5'
		| 'datamatrix'
		| 'datamatrixrectangular'
		| 'dotcode'
		| 'ean13'
		| 'ean13composite'
		| 'ean14'
		| 'ean2'
		| 'ean5'
		| 'ean8'
		| 'ean8composite'
		| 'flattermarken'
		| 'gs1-128'
		| 'gs1-128composite'
		| 'gs1-cc'
		| 'gs1datamatrix'
		| 'gs1datamatrixrectangular'
		| 'gs1northamericancoupon'
		| 'hanxin'
		| 'hibcazteccode'
		| 'hibccodablockf'
		| 'hibccode128'
		| 'hibccode39'
		| 'hibcdatamatrix'
		| 'hibcdatamatrixrectangular'
		| 'hibcmicropdf417'
		| 'hibcpdf417'
		| 'iata2of5'
		| 'identcode'
		| 'industrial2of5'
		| 'interleaved2of5'
		| 'isbn'
		| 'ismn'
		| 'issn'
		| 'itf14'
		| 'japanpost'
		| 'kix'
		| 'leitcode'
		| 'matrix2of5'
		| 'maxicode'
		| 'micropdf417'
		| 'msi'
		| 'onecode'
		| 'pdf417'
		| 'pdf417compact'
		| 'pharmacode'
		| 'pharmacode2'
		| 'planet'
		| 'plessey'
		| 'posicode'
		| 'postnet'
		| 'pzn'
		| 'rationalizedCodabar'
		| 'raw'
		| 'royalmail'
		| 'sscc18'
		| 'symbol'
		| 'telepen'
		| 'telepennumeric'
		| 'ultracode'
		| 'upca'
		| 'upcacomposite'
		| 'upce'
		| 'upcecomposite'
		| Expression<string>;
	/**
	 * The "Author" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["product", "product"], tool: ["getBookAuthorLookup", "getBookListAuthorLookup"] }
	 */
	author: string | Expression<string>;
	/**
	 * The "Category" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["product", "product", "geographic", "geographic"], tool: ["getBookCategoryLookup", "getBookListCategoryLookup", "getLocationByParams", "getLocationListByParams"] }
	 */
	category: string | Expression<string>;
	/**
	 * The "Isbn" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["product", "product", "product", "product", "product", "product", "product"], tool: ["checkBookIsbn", "checkBookIsbnExist", "getBookIsbnLookup", "checkBookIsbn10", "getBookIsbn10ToIsbn13", "checkBookIsbn13", "getBookIsbn13ToIsbn10"] }
	 */
	isbn: string | Expression<string>;
	/**
	 * The "Publisher" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["product", "product"], tool: ["getBookListPublisherLookup", "getBookPublisherLookup"] }
	 */
	publisher: string | Expression<string>;
	/**
	 * The "Title" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["product", "product"], tool: ["getBookListTitleLookup", "getBookTitleLookup"] }
	 */
	title: string | Expression<string>;
	/**
	 * The "Dni" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["personal", "personal", "personal"], tool: ["getNifByDni", "getDniNormalized", "checkDniValid"] }
	 */
	dni: string | Expression<string>;
	/**
	 * The "Cif" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["company", "company", "company"], tool: ["getCifNormalized", "checkCifValid", "getCompanyByCif"] }
	 */
	cif: string | Expression<string>;
	/**
	 * The "Nie" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["personal", "personal"], tool: ["getNieNormalized", "checkNieValid"] }
	 */
	nie: string | Expression<string>;
	/**
	 * The "Nif" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["personal", "personal", "personal"], tool: ["getNifNormalized", "checkNifValid", "checkRobinsonNifExist"] }
	 */
	nif: string | Expression<string>;
	/**
	 * The "Ip" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["geographic", "company", "company", "geographic", "geographic", "finance", "finance", "internet", "internet", "internet", "security", "geographic", "geographic", "geographic", "geographic", "geographic", "geographic", "internet", "geographic", "text", "text", "text", "geographic", "finance", "geographic"], tool: ["getCityByIp", "getCompanyByIp", "getCompanyGeocodedByIp", "getCoordinateByIp", "getCountryByIp", "getCurrencyByIp", "getCurrencyListByIp", "getDomainByIp", "checkDomainReverse", "getIpWhois", "getIpBlacklists", "getLocaleByIp", "getLocationByIp", "getReputationByIp", "getTimeByIp", "getLocationExtendedByIp", "getLocationGeocodedByIp", "getNetAton", "getNetByIp", "checkStringIp", "checkStringIp4", "checkStringIp6", "getProvinceByIp", "getVatByIp", "getZipcodeByIp"] }
	 */
	ip: string | Expression<string>;
	/**
	 * The "City" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["geographic", "geographic", "geographic"], tool: ["getCityByName", "getCityListByName", "getCityNormalized"] }
	 */
	city: string | Expression<string>;
	/**
	 * The "Phone" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["geographic", "geographic", "company", "company", "geographic", "geographic", "personal", "communication", "communication", "communication", "communication", "communication", "communication", "communication", "geographic", "geographic", "communication", "finance"], tool: ["getCityByPhone", "getCityListByPhone", "getCompanyByPhone", "getPersonListByParams", "getCountryByPhone", "getLocationByPhone", "getProfileLinkedinByPhone", "getPhoneFixed", "checkPhoneFormat", "checkPhoneFormatEs", "getPhoneNormalized", "checkPhoneOrMobileValid", "getPhoneParsed", "checkPhoneValidPrefix", "getProvinceByPhone", "getProvinceListByPhone", "checkRobinsonPhoneExist", "getVatByPhone"] }
	 */
	phone: string | Expression<string>;
	/**
	 * The "Zipcode" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["geographic", "geographic", "geographic", "geographic", "geographic", "geographic", "finance", "geographic", "geographic", "geographic", "geographic", "geographic"], tool: ["getCityByZipcode", "getCityListByZipcode", "getCommunityByZipcode", "getLocationByZipcode", "getProvinceByZipcode", "getProvinceListByZipcode", "getVatByZipcode", "getZipcodeByPrefix", "checkZipcodeExist", "checkZipcodeFormat", "getZipcodeListByPrefix", "getZipcodeNormalized"] }
	 */
	zipcode: string | Expression<string>;
	/**
	 * The "Upc" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["product", "product", "product"], tool: ["checkUpcExist", "checkUpcFormat", "getUpcLookup"] }
	 */
	upc: string | Expression<string>;
	/**
	 * The "Isin" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["company"], tool: ["checkNumberIsin"] }
	 */
	isin: string | Expression<string>;
	/**
	 * The "Number" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["company", "text", "text", "communication", "communication", "internet", "internet", "text", "text", "text", "text", "text", "text"], tool: ["checkNumberSsEs", "checkListMax", "checkListMin", "getMobileOrPhoneLookupEs", "getMobileOrPhoneMnpEs", "getNetFixip", "getNetNtoa", "checkNumberDecimal", "checkNumberEven", "checkNumberMod", "checkNumberNatural", "checkNumberOdd", "checkNumberPrime"] }
	 */
	number: string | Expression<string>;
	/**
	 * The "Uuid" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["security"], tool: ["checkNumberUuid"] }
	 */
	uuid: string | Expression<string>;
	/**
	 * The "Domain" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["company", "company", "company", "company", "company", "company", "company", "company", "company", "company", "company", "company", "security", "internet", "communication", "internet", "internet", "communication", "internet", "internet", "communication", "internet", "image", "internet", "internet", "internet", "internet", "internet", "internet", "internet", "internet", "internet", "communication", "communication", "communication", "communication", "internet", "internet", "communication", "communication", "communication"], tool: ["getCompanyByDomain", "getPersonEmailsByDomainAndArea", "getProfileFacebookByCompanyDomain", "getCompanyFinancialByDomain", "getProfileGithubByCompanyDomain", "getProfileInstagramByCompanyDomain", "getProfileLinkedinByCompanyDomain", "getCompanyNameByDomain", "getCompanyPhoneByDomain", "getProfilePinterestByCompanyDomain", "getProfileTwitterByCompanyDomain", "getProfileYoutubeByCompanyDomain", "getDomainBlacklists", "getUrlByDomain", "checkDomainCatchall", "checkDomainCertificate", "getDomainCertificate", "checkDomainDisposable", "checkDomainExist", "checkDomainFormat", "checkDomainFree", "getDomainIsp", "getDomainLogo", "checkDomainMx", "checkDomainRecord", "getDomainRecord", "getDomainRecords", "checkDomainReverse", "getDomainReverseIp", "getDomainTechnologies", "getDomainVisits", "getDomainWhois", "getEmailGdprListByDomain", "getEmailListByDomain", "getEmailRecipient", "getEmailRecipientByDomainAndFullname", "getFeedEntriesByDomain", "getFeedLastEntryByDomain", "checkSocialDomainExist", "getSocialDomainLookup", "getSocialDomainParsed"] }
	 */
	domain: string | Expression<string>;
	/**
	 * The "Duns" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["company", "company"], tool: ["getCompanyByDuns", "getCompanyFinancialByDuns"] }
	 */
	duns: string | Expression<string>;
	/**
	 * The "Email" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["company", "company", "communication", "communication", "communication", "communication", "communication", "communication", "communication", "communication", "communication", "communication", "communication", "communication", "communication", "communication", "communication", "communication", "personal", "personal", "personal", "personal", "personal", "personal", "communication", "communication", "communication"], tool: ["getCompanyByEmail", "getPersonListByParams", "checkEmailCatchall", "checkEmailDisposable", "getEmailDomain", "checkEmailExists", "checkEmailExistsExtended", "getEmailFirstReferences", "getEmailFix", "checkEmailFormat", "checkEmailFree", "getEmailListByEmail", "getEmailNormalized", "getEmailReferences", "checkEmailRole", "checkEmailSmtp", "checkEmailSpamtrap", "getEmailType", "getGenderByEmail", "getPersonByEmail", "sendPersonEmailToList", "getPersonExtendedByEmail", "getPersonExtendedByEmailAndCompany", "getProfileLinkedinByEmail", "checkRobinsonEmailExist", "checkSocialEmailExist", "getSocialEmailLookup"] }
	 */
	email: string | Expression<string>;
	/**
	 * The "Name" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["company", "company", "company", "company", "personal", "geographic", "geographic", "geographic", "geographic", "personal", "personal", "geographic", "personal", "personal"], tool: ["getCompanyByName", "getCompanyDomainByName", "getCompanyFinancialByName", "getCompanyPhoneByName", "getGenderByPersonalName", "getLocationByName", "getLocationByParams", "getLocationListByName", "getLocationListByParams", "getNameByPrefix", "checkNameExist", "getNameListByPrefix", "getNameNormalized", "checkNameValid"] }
	 */
	name: string | Expression<string>;
	/**
	 * The "Url" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["company", "internet", "internet", "image", "internet", "internet", "internet", "image", "image", "image", "image", "communication", "communication", "communication", "communication", "communication", "communication", "communication", "internet", "internet", "internet", "internet", "internet", "internet", "internet", "internet", "internet", "internet", "internet", "communication"], tool: ["getCompanyByProfile", "getDomainByUrl", "getUrlPdf", "getUrlScreenshot", "getUrlShareableLinks", "getUrlTechnologies", "getUrlUnshortened", "getImageExif", "getImageOcr", "getImageWithText", "getQrDecoded", "getLinkedinGroupMembers", "getLinkedinPostComments", "getLinkedinPostLikes", "getLinkedinProfiles", "getLinkedinProfilesByCompany", "getLinkedinPublicProfileBySalesProfile", "sendLinkedinVisit", "getUrlAnalysis", "checkUrlContains", "getUrlContents", "getUrlContentsParsed", "getUrlDecode", "getUrlEncode", "checkUrlExist", "getUrlListContentsParsed", "getUrlParsed", "getUrlTables", "checkUrlValid", "getSocialUriParsed"] }
	 */
	url: string | Expression<string>;
	/**
	 * The "Profile" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["personal", "personal", "communication", "communication", "communication", "communication", "communication", "communication", "communication", "personal"], tool: ["getPersonByProfile", "getPersonExtendedByProfile", "sendLinkedinInvitation", "sendLinkedinInvitationOrMessage", "sendLinkedinMessage", "getEmailPersonalRecipientByProfile", "getEmailRecipientByProfile", "getLinkedinProfile", "checkLinkedinProfileIsContact", "sendPersonProfileToList"] }
	 */
	profile: string | Expression<string>;
	/**
	 * The "Role" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["company"], tool: ["getRoleClassified"] }
	 */
	role: string | Expression<string>;
	/**
	 * The "Taxid" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["company", "company"], tool: ["checkCompanyDebtorByTaxid", "getCompanyFinancialByTaxid"] }
	 */
	taxid: string | Expression<string>;
	/**
	 * The "Company" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["company", "company", "company", "company", "company", "company", "company", "communication", "communication", "personal", "personal", "personal", "personal"], tool: ["getPersonDecisionMaker", "getPersonDecisionMakerBySearch", "getProfileFacebookByCompany", "getProfileLinkedinByCompany", "getPersonListByParams", "getPersonMultipleDecisionMakerBySearch", "getProfileTwitterByCompany", "getEmailRecipientByCompanyAndFullname", "getEmailRecipientByCompanyFirstnameAndLastname", "getPersonByFirstnameLastnameCompanyLocation", "getPersonExtendedByEmailAndCompany", "getProfileByEmployeeData", "getProfileXingByEmployeeData"] }
	 */
	company: string | Expression<string>;
	/**
	 * The "Area" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["company", "company", "company", "company", "company"], tool: ["getPersonDecisionMaker", "getPersonDecisionMakerBySearch", "getPersonEmailsByDomainAndArea", "getPersonListByParams", "getPersonMultipleDecisionMakerBySearch"] }
	 */
	area?:
		| 'Communications'
		| 'Consulting'
		| 'Customer service'
		| 'Education'
		| 'Engineering'
		| 'Finance'
		| 'Health professional'
		| 'Human resources'
		| 'Information technology'
		| 'Legal'
		| 'Marketing'
		| 'Operations'
		| 'Owner'
		| 'President'
		| 'Product'
		| 'Public relations'
		| 'Real estate'
		| 'Recruiting'
		| 'Research'
		| 'Sales'
		| Expression<string>;
	/**
	 * The "Clevel" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["company", "company"], tool: ["getPersonDecisionMakerBySearch", "getPersonMultipleDecisionMakerBySearch"] }
	 */
	clevel?: 'No' | 'Yes' | Expression<string>;
	/**
	 * The "Location" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["company", "company", "geographic", "geographic", "personal"], tool: ["getPersonDecisionMakerBySearch", "getPersonMultipleDecisionMakerBySearch", "getLocationByParams", "getLocationListByParams", "getPersonByFirstnameLastnameCompanyLocation"] }
	 */
	location?: string | Expression<string>;
	/**
	 * The "Keyword" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["company", "company"], tool: ["getPersonDecisionMakerBySearch", "getPersonMultipleDecisionMakerBySearch"] }
	 */
	keyword?: string | Expression<string>;
	/**
	 * The "Message" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["communication", "communication"], tool: ["sendLinkedinInvitation", "sendLinkedinMessage"] }
	 */
	message: string | Expression<string>;
	/**
	 * The "Message1" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["communication"], tool: ["sendLinkedinInvitationOrMessage"] }
	 */
	message1: string | Expression<string>;
	/**
	 * The "Message2" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["communication"], tool: ["sendLinkedinInvitationOrMessage"] }
	 */
	message2: string | Expression<string>;
	/**
	 * The "Seniority" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["company"], tool: ["getPersonListByParams"] }
	 */
	seniority?:
		| 'Apprentice'
		| 'Director'
		| 'Executive'
		| 'Intermediate'
		| 'Manager'
		| Expression<string>;
	/**
	 * The "Address1" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["geographic", "geographic"], tool: ["getDistanceByAddresses", "getRouteByAddresses"] }
	 */
	address1: string | Expression<string>;
	/**
	 * The "Address2" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["geographic", "geographic"], tool: ["getDistanceByAddresses", "getRouteByAddresses"] }
	 */
	address2: string | Expression<string>;
	/**
	 * The "Fuel consumption" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["geographic", "geographic"], tool: ["getRouteByAddresses", "getRouteByIps"] }
	 */
	fuel_consumption: string | Expression<string>;
	/**
	 * The "Price liter" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["geographic", "geographic"], tool: ["getRouteByAddresses", "getRouteByIps"] }
	 */
	price_liter: string | Expression<string>;
	/**
	 * The "Coordinates1" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["geographic", "geographic", "geographic", "geographic", "geographic", "geographic", "geographic"], tool: ["getDistanceByCoordinates", "getRouteByCoordinates", "checkDistanceEq", "checkDistanceGe", "checkDistanceGt", "checkDistanceLe", "checkDistanceLt"] }
	 */
	coordinates1: string | Expression<string>;
	/**
	 * The "Coordinates2" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["geographic", "geographic", "geographic", "geographic", "geographic", "geographic", "geographic"], tool: ["getDistanceByCoordinates", "getRouteByCoordinates", "checkDistanceEq", "checkDistanceGe", "checkDistanceGt", "checkDistanceLe", "checkDistanceLt"] }
	 */
	coordinates2: string | Expression<string>;
	/**
	 * The "Ip1" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["geographic", "geographic"], tool: ["getDistanceByIps", "getRouteByIps"] }
	 */
	ip1: string | Expression<string>;
	/**
	 * The "Ip2" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["geographic", "geographic"], tool: ["getDistanceByIps", "getRouteByIps"] }
	 */
	ip2: string | Expression<string>;
	/**
	 * The "Phone1" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["geographic", "geographic"], tool: ["getDistanceByPhones", "getRouteByPhones"] }
	 */
	phone1: string | Expression<string>;
	/**
	 * The "Phone2" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["geographic", "geographic"], tool: ["getDistanceByPhones", "getRouteByPhones"] }
	 */
	phone2: string | Expression<string>;
	/**
	 * The "Zipcode1" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["geographic", "geographic"], tool: ["getDistanceByZipcodes", "getRouteByZipcodes"] }
	 */
	zipcode1: string | Expression<string>;
	/**
	 * The "Zipcode2" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["geographic", "geographic"], tool: ["getDistanceByZipcodes", "getRouteByZipcodes"] }
	 */
	zipcode2: string | Expression<string>;
	/**
	 * The "Distance" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["geographic", "geographic", "geographic", "geographic", "geographic"], tool: ["checkDistanceEq", "checkDistanceGe", "checkDistanceGt", "checkDistanceLe", "checkDistanceLt"] }
	 */
	distance: string | Expression<string>;
	/**
	 * The "Coin" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["finance"], tool: ["checkCryptoWalletAddressValid"] }
	 */
	coin:
		| '0x'
		| 'Aave Coin'
		| 'Algorand'
		| 'Aragon'
		| 'Augur'
		| 'AugurV2'
		| 'AuroraCoin'
		| 'BTU Protocol'
		| 'Bancor'
		| 'Bankex'
		| 'Basic Attention Token'
		| 'BeaverCoin'
		| 'BioCoin'
		| 'Bitcoin'
		| 'Bitcoin SV'
		| 'BitcoinCash'
		| 'BitcoinGold'
		| 'BitcoinPrivate'
		| 'BitcoinZ'
		| 'BlockTrade'
		| 'CUSD'
		| 'Callisto'
		| 'Cardano'
		| 'Chainlink'
		| 'Civic'
		| 'Compound'
		| 'Cred'
		| 'Crypto.com Coin'
		| 'Dash'
		| 'Decentraland'
		| 'Decred'
		| 'DigiByte'
		| 'District0x'
		| 'DogeCoin'
		| 'EOS'
		| 'Enjin Coin'
		| 'EtherZero'
		| 'Ethereum'
		| 'EthereumClassic'
		| 'Expanse'
		| 'FirmaChain'
		| 'FreiCoin'
		| 'GameCredits'
		| 'GarliCoin'
		| 'Gnosis'
		| 'Golem'
		| 'Golem (GNT)'
		| 'HedgeTrade'
		| 'Hush'
		| 'HyperSpace'
		| 'Komodo'
		| 'LBRY Credits'
		| 'Lisk'
		| 'LiteCoin'
		| 'Loom Network'
		| 'Maker'
		| 'Matchpool'
		| 'Matic'
		| 'MegaCoin'
		| 'Melon'
		| 'Metal'
		| 'MonaCoin'
		| 'Monero'
		| 'Multi-collateral DAI'
		| 'NameCoin'
		| 'Nano'
		| 'Nem'
		| 'Neo'
		| 'NeoGas'
		| 'Numeraire'
		| 'Ocean Protocol'
		| 'Odyssey'
		| 'OmiseGO'
		| 'PIVX'
		| 'Paxos'
		| 'PeerCoin'
		| 'Polkadot'
		| 'Polymath'
		| 'PrimeCoin'
		| 'ProtoShares'
		| 'Qtum'
		| 'Quant'
		| 'Quantum Resistant Ledger'
		| 'RaiBlocks'
		| 'Ripio Credit Network'
		| 'Ripple'
		| 'SOLVE'
		| 'Salt'
		| 'Serve'
		| 'Siacoin'
		| 'SnowGem'
		| 'SolarCoin'
		| 'Spendcoin'
		| 'Status'
		| 'Stellar'
		| 'Storj'
		| 'Storm'
		| 'StormX'
		| 'Swarm City'
		| 'Synthetix Network'
		| 'TEMCO'
		| 'Tap'
		| 'TenX'
		| 'Tether'
		| 'Tezos'
		| 'Tron'
		| 'TrueUSD'
		| 'USD Coin'
		| 'Uniswap Coin'
		| 'VeChain'
		| 'VertCoin'
		| 'Viberate'
		| 'VoteCoin'
		| 'Waves'
		| 'Wings'
		| 'ZCash'
		| 'ZClassic'
		| 'ZenCash'
		| 'iExec RLC'
		| 'loki'
		| Expression<string>;
	/**
	 * The "Country code" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["finance"], tool: ["getCurrencyByCountryIsocode"] }
	 */
	country_code: string | Expression<string>;
	/**
	 * The "Amount" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["finance", "communication"], tool: ["getCurrencyConvertedBetweenIsocodeDate", "getLinkedinProfiles"] }
	 */
	amount: string | Expression<string>;
	/**
	 * The "Isocode1" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["finance"], tool: ["getCurrencyConvertedBetweenIsocodeDate"] }
	 */
	isocode1:
		| 'AUD'
		| 'BGN'
		| 'BRL'
		| 'CAD'
		| 'CHF'
		| 'CNY'
		| 'CZK'
		| 'DKK'
		| 'EUR'
		| 'GBP'
		| 'HKD'
		| 'HRK'
		| 'HUF'
		| 'IDR'
		| 'ILS'
		| 'INR'
		| 'ISK'
		| 'JPY'
		| 'KRW'
		| 'MXN'
		| 'MYR'
		| 'NOK'
		| 'NZD'
		| 'PHP'
		| 'PLN'
		| 'RON'
		| 'RUB'
		| 'SEK'
		| 'SGD'
		| 'THB'
		| 'TRY'
		| 'USD'
		| 'ZAR'
		| Expression<string>;
	/**
	 * The "Isocode2" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["finance"], tool: ["getCurrencyConvertedBetweenIsocodeDate"] }
	 */
	isocode2:
		| 'AUD'
		| 'BGN'
		| 'BRL'
		| 'CAD'
		| 'CHF'
		| 'CNY'
		| 'CZK'
		| 'DKK'
		| 'EUR'
		| 'GBP'
		| 'HKD'
		| 'HRK'
		| 'HUF'
		| 'IDR'
		| 'ILS'
		| 'INR'
		| 'ISK'
		| 'JPY'
		| 'KRW'
		| 'MXN'
		| 'MYR'
		| 'NOK'
		| 'NZD'
		| 'PHP'
		| 'PLN'
		| 'RON'
		| 'RUB'
		| 'SEK'
		| 'SGD'
		| 'THB'
		| 'TRY'
		| 'USD'
		| 'ZAR'
		| Expression<string>;
	/**
	 * The "Date1" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["personal", "personal", "personal", "personal", "personal", "personal", "personal"], tool: ["checkDateBetw", "getDateDifference", "checkDateEq", "checkDateGe", "checkDateGt", "checkDateLe", "checkDateLt"] }
	 */
	date1: string | Expression<string>;
	/**
	 * The "Date2" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["personal", "personal", "personal", "personal", "personal", "personal", "personal"], tool: ["checkDateBetw", "getDateDifference", "checkDateEq", "checkDateGe", "checkDateGt", "checkDateLe", "checkDateLt"] }
	 */
	date2: string | Expression<string>;
	/**
	 * The "Date3" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["personal"], tool: ["checkDateBetw"] }
	 */
	date3: string | Expression<string>;
	/**
	 * The "Period" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["personal"], tool: ["getDateDifference"] }
	 */
	period: 'days' | 'hours' | 'minutes' | 'seconds' | Expression<string>;
	/**
	 * The "Useragent" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["internet", "image"], tool: ["getDeviceByUa", "getUrlScreenshot"] }
	 */
	useragent: string | Expression<string>;
	/**
	 * The "Type" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["internet", "internet", "communication"], tool: ["checkDomainRecord", "getDomainRecord", "getLinkedinSearchContactsUrl"] }
	 */
	type?: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'NS' | 'TXT' | Expression<string>;
	/**
	 * The "Width" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["image"], tool: ["getUrlScreenshot"] }
	 */
	width?: '1024' | '160' | '320' | '640' | '800' | Expression<string>;
	/**
	 * The "Fullpage" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["image"], tool: ["getUrlScreenshot"] }
	 */
	fullpage?: 'no' | 'yes' | Expression<string>;
	/**
	 * The "Selector" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["image", "internet"], tool: ["getUrlScreenshot", "getUrlContents"] }
	 */
	selector?: string | Expression<string>;
	/**
	 * The "Delay" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["image"], tool: ["getUrlScreenshot"] }
	 */
	delay?: string | Expression<string>;
	/**
	 * The "Viewport" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["image"], tool: ["getUrlScreenshot"] }
	 */
	viewport?: string | Expression<string>;
	/**
	 * The "Email from" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["communication"], tool: ["sendEmailCustom"] }
	 */
	email_from: string | Expression<string>;
	/**
	 * The "Email to" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["communication"], tool: ["sendEmailCustom"] }
	 */
	email_to: string | Expression<string>;
	/**
	 * The "Subject" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["communication"], tool: ["sendEmailCustom"] }
	 */
	subject: string | Expression<string>;
	/**
	 * The "Body" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["communication"], tool: ["sendEmailCustom"] }
	 */
	body: string | Expression<string>;
	/**
	 * The "Page" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["communication", "communication"], tool: ["getEmailListByDomain", "getEmailListByEmail"] }
	 */
	page?: number | Expression<number>;
	/**
	 * The "Firstname" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["communication", "communication", "personal", "personal", "personal"], tool: ["getEmailRecipient", "getEmailRecipientByCompanyFirstnameAndLastname", "getPersonByFirstnameLastnameCompanyLocation", "getProfileByEmployeeData", "getProfileXingByEmployeeData"] }
	 */
	firstname: string | Expression<string>;
	/**
	 * The "Lastname" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["communication", "communication", "personal", "personal", "personal"], tool: ["getEmailRecipient", "getEmailRecipientByCompanyFirstnameAndLastname", "getPersonByFirstnameLastnameCompanyLocation", "getProfileByEmployeeData", "getProfileXingByEmployeeData"] }
	 */
	lastname?: string | Expression<string>;
	/**
	 * The "Mode" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["communication", "communication", "communication", "communication", "communication", "communication", "communication", "communication"], tool: ["getEmailRecipient", "getEmailRecipientByCompanyAndFullname", "getEmailRecipientByCompanyFirstnameAndLastname", "getEmailRecipientByDomainAndFullname", "getLinkedinConnections", "getLinkedinInvitations", "getLinkedinProfile", "getLinkedinProfiles"] }
	 */
	mode: 'guess' | 'only_verify' | 'verify' | Expression<string>;
	/**
	 * The "Fullname" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["communication", "communication", "personal"], tool: ["getEmailRecipientByCompanyAndFullname", "getEmailRecipientByDomainAndFullname", "getFullnameParsed"] }
	 */
	fullname: string | Expression<string>;
	/**
	 * The "Mobile" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["communication", "communication", "communication", "communication", "communication", "communication", "communication", "communication", "communication", "communication", "communication", "communication", "communication", "communication", "personal", "communication", "communication"], tool: ["sendMobileSms", "checkMobileAlive", "getMobileCountryCode", "checkMobileExist", "checkMobileFormat", "checkMobileFormatEs", "getMobileFormatted", "getMobileHlrLookup", "getMobileLookup", "getMobileMnpLookup", "getMobileNormalized", "checkMobileSms", "checkMobileValidPrefix", "checkMobileValidPrefixEs", "getPersonByMobile", "checkSocialMobileExist", "getSocialMobileLookup"] }
	 */
	mobile: string | Expression<string>;
	/**
	 * The "Url dlr" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["communication"], tool: ["sendMobileSms"] }
	 */
	url_dlr?: string | Expression<string>;
	/**
	 * The "Source" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["internet"], tool: ["getFileCopiedBetweenUrls"] }
	 */
	source: string | Expression<string>;
	/**
	 * The "Destination" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["internet"], tool: ["getFileCopiedBetweenUrls"] }
	 */
	destination: string | Expression<string>;
	/**
	 * The "Size" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["image"], tool: ["getImageWithText"] }
	 */
	size?: string | Expression<string>;
	/**
	 * The "List" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["communication", "communication", "communication", "communication", "communication", "communication", "communication", "communication", "communication", "text", "text", "text", "text", "text", "text", "text", "text", "text", "text", "text", "text", "text", "text", "text", "text", "text", "text", "personal", "personal"], tool: ["getLinkedinConnections", "getLinkedinGroupMembers", "getLinkedinInvitations", "getLinkedinPostComments", "getLinkedinPostLikes", "getLinkedinProfile", "getLinkedinProfiles", "getLinkedinProfilesByCompany", "getLinkedinProfilesByContent", "checkListContains", "checkListEnds", "checkListLengthBetw", "checkListLengthEq", "checkListLengthGe", "checkListLengthGt", "checkListLengthLe", "checkListLengthLt", "checkListMax", "getListMax", "checkListMin", "getListMin", "getListSort", "checkListSorted", "checkListStarts", "checkListUnique", "getListUnique", "checkListValid", "sendPersonEmailToList", "sendPersonProfileToList"] }
	 */
	list?: string | Expression<string>;
	/**
	 * The "Keywords" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["communication"], tool: ["getLinkedinProfilesByContent"] }
	 */
	keywords?: string | Expression<string>;
	/**
	 * The "Current company" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["communication"], tool: ["getLinkedinSearchContactsUrl"] }
	 */
	current_company?: string | Expression<string>;
	/**
	 * The "Current title" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["communication"], tool: ["getLinkedinSearchContactsUrl"] }
	 */
	current_title?: string | Expression<string>;
	/**
	 * The "Included companies" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["communication"], tool: ["getLinkedinSearchContactsUrl"] }
	 */
	included_companies?: string | Expression<string>;
	/**
	 * The "Excluded companies" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["communication"], tool: ["getLinkedinSearchContactsUrl"] }
	 */
	excluded_companies?: string | Expression<string>;
	/**
	 * The "Included titles" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["communication"], tool: ["getLinkedinSearchContactsUrl"] }
	 */
	included_titles?: string | Expression<string>;
	/**
	 * The "Excluded titles" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["communication"], tool: ["getLinkedinSearchContactsUrl"] }
	 */
	excluded_titles?: string | Expression<string>;
	/**
	 * The "Included keywords" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["communication"], tool: ["getLinkedinSearchContactsUrl"] }
	 */
	included_keywords?: string | Expression<string>;
	/**
	 * The "Excluded keywords" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["communication"], tool: ["getLinkedinSearchContactsUrl"] }
	 */
	excluded_keywords?: string | Expression<string>;
	/**
	 * The "Length1" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["text", "text"], tool: ["checkListLengthBetw", "checkStringLengthBetw"] }
	 */
	length1: number | Expression<number>;
	/**
	 * The "Length2" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["text", "text"], tool: ["checkListLengthBetw", "checkStringLengthBetw"] }
	 */
	length2: number | Expression<number>;
	/**
	 * The "Length" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["text", "text", "text", "text", "text", "text", "text", "text", "text", "text"], tool: ["checkListLengthEq", "checkListLengthGe", "checkListLengthGt", "checkListLengthLe", "checkListLengthLt", "checkStringLengthEq", "checkStringLengthGe", "checkStringLengthGt", "checkStringLengthLe", "checkStringLengthLt"] }
	 */
	length: number | Expression<number>;
	/**
	 * The "Separator" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["text", "text", "text"], tool: ["checkListValid", "getStringSplit", "getStringSplitAndJoin"] }
	 */
	separator: string | Expression<string>;
	/**
	 * The "Latitude" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["geographic"], tool: ["getTimeByCoordinates"] }
	 */
	latitude: string | Expression<string>;
	/**
	 * The "Longitude" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["geographic"], tool: ["getTimeByCoordinates"] }
	 */
	longitude: string | Expression<string>;
	/**
	 * The "Radius" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["geographic", "geographic"], tool: ["getLocationByParams", "getLocationListByParams"] }
	 */
	radius?: string | Expression<string>;
	/**
	 * The "Imei" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["communication"], tool: ["checkMobileImei"] }
	 */
	imei: string | Expression<string>;
	/**
	 * The "Regex" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["internet", "text", "text"], tool: ["checkUrlContains", "getStringByRegex", "checkStringRegex"] }
	 */
	regex: string | Expression<string>;
	/**
	 * The "Host" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["internet", "internet", "internet"], tool: ["checkNetHostAlive", "getNetScan", "checkNetServiceUp"] }
	 */
	host: string | Expression<string>;
	/**
	 * The "Port" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["internet"], tool: ["checkNetServiceUp"] }
	 */
	port: string | Expression<string>;
	/**
	 * The "Table" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["internet"], tool: ["getUrlTables"] }
	 */
	table?: string | Expression<string>;
	/**
	 * The "Number1" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["text", "text", "text", "text", "text", "text"], tool: ["checkNumberBetw", "checkNumberEq", "checkNumberGe", "checkNumberGt", "checkNumberLe", "checkNumberLt"] }
	 */
	number1: string | Expression<string>;
	/**
	 * The "Number2" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["text", "text", "text", "text", "text", "text"], tool: ["checkNumberBetw", "checkNumberEq", "checkNumberGe", "checkNumberGt", "checkNumberLe", "checkNumberLt"] }
	 */
	number2: string | Expression<string>;
	/**
	 * The "Number3" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["text"], tool: ["checkNumberBetw"] }
	 */
	number3: string | Expression<string>;
	/**
	 * The "Luhn" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["security"], tool: ["checkNumberLuhn"] }
	 */
	luhn: string | Expression<string>;
	/**
	 * The "Mod" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["text"], tool: ["checkNumberMod"] }
	 */
	mod: string | Expression<string>;
	/**
	 * The "Rest" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["text"], tool: ["checkNumberMod"] }
	 */
	rest: string | Expression<string>;
	/**
	 * The "Password" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["security"], tool: ["checkPasswordStrong"] }
	 */
	password: string | Expression<string>;
	/**
	 * The "Locality" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["personal"], tool: ["getPersonFakedData"] }
	 */
	locality:
		| 'Australia (English)'
		| 'Australia Ocker (English)'
		| 'Azerbaijani'
		| 'Bork (English)'
		| 'Canada (English)'
		| 'Canada (French)'
		| 'Chinese'
		| 'Chinese (Taiwan)'
		| 'Czech'
		| 'Dutch'
		| 'English'
		| 'Farsi'
		| 'French'
		| 'Georgian'
		| 'German'
		| 'German (Austria)'
		| 'German (Switzerland)'
		| 'Great Britain (English)'
		| 'India (English)'
		| 'Indonesia'
		| 'Ireland (English)'
		| 'Italian'
		| 'Japanese'
		| 'Korean'
		| 'Nepalese'
		| 'Norwegian'
		| 'Polish'
		| 'Portuguese (Brazil)'
		| 'Russian'
		| 'Slovakian'
		| 'Spanish'
		| 'Spanish Mexico'
		| 'Swedish'
		| 'Turkish'
		| 'Ukrainian'
		| 'United States (English)'
		| 'Vietnamese'
		| Expression<string>;
	/**
	 * The "Surname" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["personal", "personal", "personal", "personal", "personal"], tool: ["getSurnameByPrefix", "checkSurnameExist", "getSurnameListByPrefix", "getSurnameNormalized", "checkSurnameValid"] }
	 */
	surname: string | Expression<string>;
	/**
	 * The "Province" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["geographic", "geographic", "geographic"], tool: ["getProvinceByName", "getProvinceListByName", "getProvinceNormalized"] }
	 */
	province: string | Expression<string>;
	/**
	 * The "Format" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["text"], tool: ["getStringByFormat"] }
	 */
	format: string | Expression<string>;
	/**
	 * The "Text1" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["text", "text", "text", "text"], tool: ["checkStringContains", "checkStringEnds", "getStringJoin", "checkStringStarts"] }
	 */
	text1: string | Expression<string>;
	/**
	 * The "Text2" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["text", "text", "text", "text"], tool: ["checkStringContains", "checkStringEnds", "getStringJoin", "checkStringStarts"] }
	 */
	text2: string | Expression<string>;
	/**
	 * The "Glue" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["text", "text"], tool: ["getStringJoin", "getStringSplitAndJoin"] }
	 */
	glue: string | Expression<string>;
	/**
	 * The "Field" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["text"], tool: ["getStringNormalized"] }
	 */
	field:
		| 'alphabetic'
		| 'alphanumeric'
		| 'cif'
		| 'city'
		| 'country'
		| 'date'
		| 'decimal'
		| 'dni'
		| 'domain'
		| 'email'
		| 'gender'
		| 'integer'
		| 'ip'
		| 'mobile'
		| 'name'
		| 'nie'
		| 'nif'
		| 'phone'
		| 'province'
		| 'zipcode'
		| Expression<string>;
	/**
	 * The "Find" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["text", "text"], tool: ["getStringReplaceAll", "getStringReplaceFirst"] }
	 */
	find: string | Expression<string>;
	/**
	 * The "Replace" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["text", "text"], tool: ["getStringReplaceAll", "getStringReplaceFirst"] }
	 */
	replace: string | Expression<string>;
	/**
	 * The "Texts" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["text"], tool: ["getStringVlookup"] }
	 */
	texts: string | Expression<string>;
	/**
	 * The "Html" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["text"], tool: ["getStringWithoutHtml"] }
	 */
	html: string | Expression<string>;
	/**
	 * The "Tin" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["finance", "finance"], tool: ["getVatByNumber", "checkVatExist"] }
	 */
	tin: string | Expression<string>;
	/**
	 * The "Vin" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["product", "product"], tool: ["checkVinFormat", "getVinLookup"] }
	 */
	vin: string | Expression<string>;
	/**
	 * The "Count1" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["text"], tool: ["checkWordCountBetw"] }
	 */
	count1: string | Expression<string>;
	/**
	 * The "Count2" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["text"], tool: ["checkWordCountBetw"] }
	 */
	count2: string | Expression<string>;
	/**
	 * The "Count" value to use as a parameter for this Operation
	 * @displayOptions.show { group: ["text", "text", "text", "text", "text"], tool: ["checkWordCountEq", "checkWordCountGe", "checkWordCountGt", "checkWordCountLe", "checkWordCountLt"] }
	 */
	count: string | Expression<string>;
	additionalOptions?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface UprocV1Credentials {
	uprocApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type UprocV1Node = {
	type: 'n8n-nodes-base.uproc';
	version: 1;
	config: NodeConfig<UprocV1Params>;
	credentials?: UprocV1Credentials;
};

export type UprocNode = UprocV1Node;
