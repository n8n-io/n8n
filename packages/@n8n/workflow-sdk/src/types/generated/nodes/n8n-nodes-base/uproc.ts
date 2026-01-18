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
	 * @default getAudioAdvancedSpeechByText
	 */
	tool?: 'getAudioAdvancedSpeechByText' | 'getAudioSpeechByText' | Expression<string>;
	/**
	 * The "Credit card" value to use as a parameter for this Operation
	 */
	credit_card: string | Expression<string>;
	/**
	 * The "Address" value to use as a parameter for this Operation
	 */
	address: string | Expression<string>;
	/**
	 * The "Country" value to use as a parameter for this Operation
	 */
	country?: string | Expression<string>;
	/**
	 * The "Coordinates" value to use as a parameter for this Operation
	 */
	coordinates: string | Expression<string>;
	/**
	 * The "Date" value to use as a parameter for this Operation
	 */
	date: string | Expression<string>;
	/**
	 * The "Years1" value to use as a parameter for this Operation
	 */
	years1: number | Expression<number>;
	/**
	 * The "Years2" value to use as a parameter for this Operation
	 */
	years2: number | Expression<number>;
	/**
	 * The "Years" value to use as a parameter for this Operation
	 */
	years: number | Expression<number>;
	/**
	 * The "Ean" value to use as a parameter for this Operation
	 */
	ean: string | Expression<string>;
	/**
	 * The "Asin" value to use as a parameter for this Operation
	 */
	asin: string | Expression<string>;
	/**
	 * The "Text" value to use as a parameter for this Operation
	 */
	text: string | Expression<string>;
	/**
	 * The "Gender" value to use as a parameter for this Operation
	 */
	gender: 'female' | 'male' | Expression<string>;
	/**
	 * The "Language" value to use as a parameter for this Operation
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
	 */
	account: string | Expression<string>;
	/**
	 * The "Bic" value to use as a parameter for this Operation
	 */
	bic: string | Expression<string>;
	/**
	 * The "Isocode" value to use as a parameter for this Operation
	 */
	isocode: string | Expression<string>;
	/**
	 * The "Iban" value to use as a parameter for this Operation
	 */
	iban: string | Expression<string>;
	/**
	 * The "Swift" value to use as a parameter for this Operation
	 */
	swift: string | Expression<string>;
	/**
	 * The "Bcid" value to use as a parameter for this Operation
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
	 */
	author: string | Expression<string>;
	/**
	 * The "Category" value to use as a parameter for this Operation
	 */
	category: string | Expression<string>;
	/**
	 * The "Isbn" value to use as a parameter for this Operation
	 */
	isbn: string | Expression<string>;
	/**
	 * The "Publisher" value to use as a parameter for this Operation
	 */
	publisher: string | Expression<string>;
	/**
	 * The "Title" value to use as a parameter for this Operation
	 */
	title: string | Expression<string>;
	/**
	 * The "Dni" value to use as a parameter for this Operation
	 */
	dni: string | Expression<string>;
	/**
	 * The "Cif" value to use as a parameter for this Operation
	 */
	cif: string | Expression<string>;
	/**
	 * The "Nie" value to use as a parameter for this Operation
	 */
	nie: string | Expression<string>;
	/**
	 * The "Nif" value to use as a parameter for this Operation
	 */
	nif: string | Expression<string>;
	/**
	 * The "Ip" value to use as a parameter for this Operation
	 */
	ip: string | Expression<string>;
	/**
	 * The "City" value to use as a parameter for this Operation
	 */
	city: string | Expression<string>;
	/**
	 * The "Phone" value to use as a parameter for this Operation
	 */
	phone: string | Expression<string>;
	/**
	 * The "Zipcode" value to use as a parameter for this Operation
	 */
	zipcode: string | Expression<string>;
	/**
	 * The "Upc" value to use as a parameter for this Operation
	 */
	upc: string | Expression<string>;
	/**
	 * The "Isin" value to use as a parameter for this Operation
	 */
	isin: string | Expression<string>;
	/**
	 * The "Number" value to use as a parameter for this Operation
	 */
	number: string | Expression<string>;
	/**
	 * The "Uuid" value to use as a parameter for this Operation
	 */
	uuid: string | Expression<string>;
	/**
	 * The "Domain" value to use as a parameter for this Operation
	 */
	domain: string | Expression<string>;
	/**
	 * The "Duns" value to use as a parameter for this Operation
	 */
	duns: string | Expression<string>;
	/**
	 * The "Email" value to use as a parameter for this Operation
	 */
	email: string | Expression<string>;
	/**
	 * The "Name" value to use as a parameter for this Operation
	 */
	name: string | Expression<string>;
	/**
	 * The "Url" value to use as a parameter for this Operation
	 */
	url: string | Expression<string>;
	/**
	 * The "Profile" value to use as a parameter for this Operation
	 */
	profile: string | Expression<string>;
	/**
	 * The "Role" value to use as a parameter for this Operation
	 */
	role: string | Expression<string>;
	/**
	 * The "Taxid" value to use as a parameter for this Operation
	 */
	taxid: string | Expression<string>;
	/**
	 * The "Company" value to use as a parameter for this Operation
	 */
	company: string | Expression<string>;
	/**
	 * The "Area" value to use as a parameter for this Operation
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
	 */
	clevel?: 'No' | 'Yes' | Expression<string>;
	/**
	 * The "Location" value to use as a parameter for this Operation
	 */
	location?: string | Expression<string>;
	/**
	 * The "Keyword" value to use as a parameter for this Operation
	 */
	keyword?: string | Expression<string>;
	/**
	 * The "Message" value to use as a parameter for this Operation
	 */
	message: string | Expression<string>;
	/**
	 * The "Message1" value to use as a parameter for this Operation
	 */
	message1: string | Expression<string>;
	/**
	 * The "Message2" value to use as a parameter for this Operation
	 */
	message2: string | Expression<string>;
	/**
	 * The "Seniority" value to use as a parameter for this Operation
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
	 */
	address1: string | Expression<string>;
	/**
	 * The "Address2" value to use as a parameter for this Operation
	 */
	address2: string | Expression<string>;
	/**
	 * The "Fuel consumption" value to use as a parameter for this Operation
	 */
	fuel_consumption: string | Expression<string>;
	/**
	 * The "Price liter" value to use as a parameter for this Operation
	 */
	price_liter: string | Expression<string>;
	/**
	 * The "Coordinates1" value to use as a parameter for this Operation
	 */
	coordinates1: string | Expression<string>;
	/**
	 * The "Coordinates2" value to use as a parameter for this Operation
	 */
	coordinates2: string | Expression<string>;
	/**
	 * The "Ip1" value to use as a parameter for this Operation
	 */
	ip1: string | Expression<string>;
	/**
	 * The "Ip2" value to use as a parameter for this Operation
	 */
	ip2: string | Expression<string>;
	/**
	 * The "Phone1" value to use as a parameter for this Operation
	 */
	phone1: string | Expression<string>;
	/**
	 * The "Phone2" value to use as a parameter for this Operation
	 */
	phone2: string | Expression<string>;
	/**
	 * The "Zipcode1" value to use as a parameter for this Operation
	 */
	zipcode1: string | Expression<string>;
	/**
	 * The "Zipcode2" value to use as a parameter for this Operation
	 */
	zipcode2: string | Expression<string>;
	/**
	 * The "Distance" value to use as a parameter for this Operation
	 */
	distance: string | Expression<string>;
	/**
	 * The "Coin" value to use as a parameter for this Operation
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
	 */
	country_code: string | Expression<string>;
	/**
	 * The "Amount" value to use as a parameter for this Operation
	 */
	amount: string | Expression<string>;
	/**
	 * The "Isocode1" value to use as a parameter for this Operation
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
	 */
	date1: string | Expression<string>;
	/**
	 * The "Date2" value to use as a parameter for this Operation
	 */
	date2: string | Expression<string>;
	/**
	 * The "Date3" value to use as a parameter for this Operation
	 */
	date3: string | Expression<string>;
	/**
	 * The "Period" value to use as a parameter for this Operation
	 */
	period: 'days' | 'hours' | 'minutes' | 'seconds' | Expression<string>;
	/**
	 * The "Useragent" value to use as a parameter for this Operation
	 */
	useragent: string | Expression<string>;
	/**
	 * The "Type" value to use as a parameter for this Operation
	 */
	type?: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'NS' | 'TXT' | Expression<string>;
	/**
	 * The "Width" value to use as a parameter for this Operation
	 */
	width?: '1024' | '160' | '320' | '640' | '800' | Expression<string>;
	/**
	 * The "Fullpage" value to use as a parameter for this Operation
	 */
	fullpage?: 'no' | 'yes' | Expression<string>;
	/**
	 * The "Selector" value to use as a parameter for this Operation
	 */
	selector?: string | Expression<string>;
	/**
	 * The "Delay" value to use as a parameter for this Operation
	 */
	delay?: string | Expression<string>;
	/**
	 * The "Viewport" value to use as a parameter for this Operation
	 */
	viewport?: string | Expression<string>;
	/**
	 * The "Email from" value to use as a parameter for this Operation
	 */
	email_from: string | Expression<string>;
	/**
	 * The "Email to" value to use as a parameter for this Operation
	 */
	email_to: string | Expression<string>;
	/**
	 * The "Subject" value to use as a parameter for this Operation
	 */
	subject: string | Expression<string>;
	/**
	 * The "Body" value to use as a parameter for this Operation
	 */
	body: string | Expression<string>;
	/**
	 * The "Page" value to use as a parameter for this Operation
	 */
	page?: number | Expression<number>;
	/**
	 * The "Firstname" value to use as a parameter for this Operation
	 */
	firstname: string | Expression<string>;
	/**
	 * The "Lastname" value to use as a parameter for this Operation
	 */
	lastname?: string | Expression<string>;
	/**
	 * The "Mode" value to use as a parameter for this Operation
	 */
	mode: 'guess' | 'only_verify' | 'verify' | Expression<string>;
	/**
	 * The "Fullname" value to use as a parameter for this Operation
	 */
	fullname: string | Expression<string>;
	/**
	 * The "Mobile" value to use as a parameter for this Operation
	 */
	mobile: string | Expression<string>;
	/**
	 * The "Url dlr" value to use as a parameter for this Operation
	 */
	url_dlr?: string | Expression<string>;
	/**
	 * The "Source" value to use as a parameter for this Operation
	 */
	source: string | Expression<string>;
	/**
	 * The "Destination" value to use as a parameter for this Operation
	 */
	destination: string | Expression<string>;
	/**
	 * The "Size" value to use as a parameter for this Operation
	 */
	size?: string | Expression<string>;
	/**
	 * The "List" value to use as a parameter for this Operation
	 */
	list?: string | Expression<string>;
	/**
	 * The "Keywords" value to use as a parameter for this Operation
	 */
	keywords?: string | Expression<string>;
	/**
	 * The "Current company" value to use as a parameter for this Operation
	 */
	current_company?: string | Expression<string>;
	/**
	 * The "Current title" value to use as a parameter for this Operation
	 */
	current_title?: string | Expression<string>;
	/**
	 * The "Included companies" value to use as a parameter for this Operation
	 */
	included_companies?: string | Expression<string>;
	/**
	 * The "Excluded companies" value to use as a parameter for this Operation
	 */
	excluded_companies?: string | Expression<string>;
	/**
	 * The "Included titles" value to use as a parameter for this Operation
	 */
	included_titles?: string | Expression<string>;
	/**
	 * The "Excluded titles" value to use as a parameter for this Operation
	 */
	excluded_titles?: string | Expression<string>;
	/**
	 * The "Included keywords" value to use as a parameter for this Operation
	 */
	included_keywords?: string | Expression<string>;
	/**
	 * The "Excluded keywords" value to use as a parameter for this Operation
	 */
	excluded_keywords?: string | Expression<string>;
	/**
	 * The "Length1" value to use as a parameter for this Operation
	 */
	length1: number | Expression<number>;
	/**
	 * The "Length2" value to use as a parameter for this Operation
	 */
	length2: number | Expression<number>;
	/**
	 * The "Length" value to use as a parameter for this Operation
	 */
	length: number | Expression<number>;
	/**
	 * The "Separator" value to use as a parameter for this Operation
	 */
	separator: string | Expression<string>;
	/**
	 * The "Latitude" value to use as a parameter for this Operation
	 */
	latitude: string | Expression<string>;
	/**
	 * The "Longitude" value to use as a parameter for this Operation
	 */
	longitude: string | Expression<string>;
	/**
	 * The "Radius" value to use as a parameter for this Operation
	 */
	radius?: string | Expression<string>;
	/**
	 * The "Imei" value to use as a parameter for this Operation
	 */
	imei: string | Expression<string>;
	/**
	 * The "Regex" value to use as a parameter for this Operation
	 */
	regex: string | Expression<string>;
	/**
	 * The "Host" value to use as a parameter for this Operation
	 */
	host: string | Expression<string>;
	/**
	 * The "Port" value to use as a parameter for this Operation
	 */
	port: string | Expression<string>;
	/**
	 * The "Table" value to use as a parameter for this Operation
	 */
	table?: string | Expression<string>;
	/**
	 * The "Number1" value to use as a parameter for this Operation
	 */
	number1: string | Expression<string>;
	/**
	 * The "Number2" value to use as a parameter for this Operation
	 */
	number2: string | Expression<string>;
	/**
	 * The "Number3" value to use as a parameter for this Operation
	 */
	number3: string | Expression<string>;
	/**
	 * The "Luhn" value to use as a parameter for this Operation
	 */
	luhn: string | Expression<string>;
	/**
	 * The "Mod" value to use as a parameter for this Operation
	 */
	mod: string | Expression<string>;
	/**
	 * The "Rest" value to use as a parameter for this Operation
	 */
	rest: string | Expression<string>;
	/**
	 * The "Password" value to use as a parameter for this Operation
	 */
	password: string | Expression<string>;
	/**
	 * The "Locality" value to use as a parameter for this Operation
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
	 */
	surname: string | Expression<string>;
	/**
	 * The "Province" value to use as a parameter for this Operation
	 */
	province: string | Expression<string>;
	/**
	 * The "Format" value to use as a parameter for this Operation
	 */
	format: string | Expression<string>;
	/**
	 * The "Text1" value to use as a parameter for this Operation
	 */
	text1: string | Expression<string>;
	/**
	 * The "Text2" value to use as a parameter for this Operation
	 */
	text2: string | Expression<string>;
	/**
	 * The "Glue" value to use as a parameter for this Operation
	 */
	glue: string | Expression<string>;
	/**
	 * The "Field" value to use as a parameter for this Operation
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
	 */
	find: string | Expression<string>;
	/**
	 * The "Replace" value to use as a parameter for this Operation
	 */
	replace: string | Expression<string>;
	/**
	 * The "Texts" value to use as a parameter for this Operation
	 */
	texts: string | Expression<string>;
	/**
	 * The "Html" value to use as a parameter for this Operation
	 */
	html: string | Expression<string>;
	/**
	 * The "Tin" value to use as a parameter for this Operation
	 */
	tin: string | Expression<string>;
	/**
	 * The "Vin" value to use as a parameter for this Operation
	 */
	vin: string | Expression<string>;
	/**
	 * The "Count1" value to use as a parameter for this Operation
	 */
	count1: string | Expression<string>;
	/**
	 * The "Count2" value to use as a parameter for this Operation
	 */
	count2: string | Expression<string>;
	/**
	 * The "Count" value to use as a parameter for this Operation
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
// Node Type
// ===========================================================================

export type UprocNode = {
	type: 'n8n-nodes-base.uproc';
	version: 1;
	config: NodeConfig<UprocV1Params>;
	credentials?: UprocV1Credentials;
};
