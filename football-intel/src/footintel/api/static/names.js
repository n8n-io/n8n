/* French names of national teams, for display only (D85). The data keeps the English names
   of the results file (connectors/international.py): filters and "my teams" compare those.
   Only names that differ in French are listed. Names that are also common first names
   (Jordan, Chad) are left out, because the replacement runs on all displayed text. */
(() => {
  const FR = {
    "Albania": "Albanie", "Algeria": "Algérie", "Argentina": "Argentine", "Armenia": "Arménie",
    "Australia": "Australie", "Austria": "Autriche", "Azerbaijan": "Azerbaïdjan", "Belarus": "Biélorussie",
    "Belgium": "Belgique", "Benin": "Bénin", "Bolivia": "Bolivie", "Bosnia and Herzegovina": "Bosnie-Herzégovine",
    "Brazil": "Brésil", "Bulgaria": "Bulgarie", "Cameroon": "Cameroun", "Cape Verde": "Cap-Vert",
    "Central African Republic": "Centrafrique", "Chile": "Chili", "China": "Chine", "Colombia": "Colombie",
    "Comoros": "Comores", "Congo": "Congo-Brazzaville", "Croatia": "Croatie", "Cyprus": "Chypre",
    "Czech Republic": "Tchéquie", "Denmark": "Danemark", "Dominican Republic": "République dominicaine",
    "DR Congo": "RD Congo", "Ecuador": "Équateur", "Egypt": "Égypte", "England": "Angleterre",
    "Equatorial Guinea": "Guinée équatoriale", "Estonia": "Estonie", "Ethiopia": "Éthiopie",
    "Faroe Islands": "Îles Féroé", "Finland": "Finlande", "Gambia": "Gambie", "Georgia": "Géorgie",
    "Germany": "Allemagne", "Greece": "Grèce", "Guinea": "Guinée", "Guinea-Bissau": "Guinée-Bissau",
    "Hungary": "Hongrie", "Iceland": "Islande", "India": "Inde", "Indonesia": "Indonésie", "Iraq": "Irak",
    "Republic of Ireland": "Irlande", "Northern Ireland": "Irlande du Nord", "Israel": "Israël",
    "Italy": "Italie", "Ivory Coast": "Côte d'Ivoire", "Jamaica": "Jamaïque", "Japan": "Japon",
    "Kazakhstan": "Kazakhstan", "Kuwait": "Koweït", "Kyrgyzstan": "Kirghizistan", "Latvia": "Lettonie",
    "Lebanon": "Liban", "Libya": "Libye", "Lithuania": "Lituanie", "Malaysia": "Malaisie",
    "Mauritania": "Mauritanie", "Mexico": "Mexique", "Moldova": "Moldavie", "Mongolia": "Mongolie",
    "Montenegro": "Monténégro", "Morocco": "Maroc", "Mozambique": "Mozambique", "Namibia": "Namibie",
    "Netherlands": "Pays-Bas", "New Zealand": "Nouvelle-Zélande", "North Korea": "Corée du Nord",
    "North Macedonia": "Macédoine du Nord", "Norway": "Norvège", "Palestine": "Palestine",
    "Paraguay": "Paraguay", "Peru": "Pérou", "Poland": "Pologne", "Romania": "Roumanie", "Russia": "Russie",
    "Saudi Arabia": "Arabie saoudite", "Scotland": "Écosse", "Senegal": "Sénégal", "Serbia": "Serbie",
    "Singapore": "Singapour", "Slovakia": "Slovaquie", "Slovenia": "Slovénie", "South Africa": "Afrique du Sud",
    "South Korea": "Corée du Sud", "Spain": "Espagne", "Sudan": "Soudan", "Sweden": "Suède",
    "Switzerland": "Suisse", "Syria": "Syrie", "Tajikistan": "Tadjikistan", "Tanzania": "Tanzanie",
    "Thailand": "Thaïlande", "Tunisia": "Tunisie", "Turkey": "Turquie", "Uganda": "Ouganda",
    "Ukraine": "Ukraine", "United Arab Emirates": "Émirats arabes unis", "United States": "États-Unis",
    "Uzbekistan": "Ouzbékistan", "Vietnam": "Viêt Nam", "Wales": "Pays de Galles", "Yemen": "Yémen",
    "Zambia": "Zambie", "Zimbabwe": "Zimbabwe",
    "Malta": "Malte", "Andorra": "Andorre", "San Marino": "Saint-Marin", "Haiti": "Haïti",
    "Trinidad and Tobago": "Trinité-et-Tobago", "El Salvador": "Salvador", "Bahrain": "Bahreïn",
    "Cook Islands": "Îles Cook", "Solomon Islands": "Îles Salomon", "New Caledonia": "Nouvelle-Calédonie",
    "Fiji": "Fidji", "Liberia": "Libéria", "South Sudan": "Soudan du Sud", "Somalia": "Somalie",
    "Eritrea": "Érythrée", "Mauritius": "Maurice", "Cambodia": "Cambodge", "Turkmenistan": "Turkménistan",
    "Nepal": "Népal", "Bhutan": "Bhoutan", "Grenada": "Grenade", "Saint Lucia": "Sainte-Lucie",
    "Saint Kitts and Nevis": "Saint-Christophe-et-Niévès", "Dominica": "Dominique",
    "Saint Vincent and the Grenadines": "Saint-Vincent-et-les-Grenadines",
  };
  for (const k of Object.keys(FR)) if (FR[k] === k) delete FR[k];
  // Longest names first, so "Northern Ireland" wins over a shorter name inside it.
  const keys = Object.keys(FR).sort((a, b) => b.length - a.length)
    .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`(?<![\\p{L}\\-])(${keys.join("|")})(?![\\p{L}])`, "gu");
  window.FI_TEAM_FR = FR;
  window.frNames = (s) => String(s ?? "").replace(re, (k) => FR[k]);
})();
