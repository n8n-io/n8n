// CRM seed data — Deals, Contacts, Companies, Activities
// Matches A2Dash schema shape (object_id, record_id, fields).

window.SEED = (() => {
  const COMPANIES = [
    { id: "c_acme",      name: "Acme Corp",       industry: "Manufacturing", size: "501–1,000", website: "acme.com",        domain: "AC", color: "#D97757" },
    { id: "c_globetech", name: "GlobeTech",       industry: "SaaS",          size: "201–500",   website: "globetech.io",    domain: "GT", color: "#5B60E8" },
    { id: "c_northwind", name: "Northwind Trade", industry: "Logistics",     size: "51–200",    website: "northwind.co",    domain: "NW", color: "#0EAA60" },
    { id: "c_initech",   name: "Initech",         industry: "FinTech",       size: "1,001+",    website: "initech.com",     domain: "IT", color: "#8E62D9" },
    { id: "c_pied",      name: "Pied Piper",      industry: "AI / Data",     size: "11–50",     website: "piedpiper.ai",    domain: "PP", color: "#E08338" },
    { id: "c_stark",     name: "Stark Industries",industry: "R&D",           size: "1,001+",    website: "stark.com",       domain: "SI", color: "#C8403B" },
    { id: "c_dunder",    name: "Dunder Mifflin",  industry: "Paper",         size: "11–50",     website: "dundermifflin.com", domain: "DM", color: "#0E6FCB" },
  ];

  const CONTACTS = [
    { id: "p_jane",   name: "Jane Cooper",    title: "VP Operations",    company: "c_acme",      email: "jane@acme.com",       phone: "+1 (415) 555-0118" },
    { id: "p_dries",  name: "Dries Vincent",  title: "CTO",              company: "c_globetech", email: "dries@globetech.io",  phone: "+1 (415) 555-0107" },
    { id: "p_brook",  name: "Brooklyn Simmons",title:"Head of RevOps",   company: "c_northwind", email: "brook@northwind.co",  phone: "+1 (415) 555-0142" },
    { id: "p_leslie", name: "Leslie Alexander",title:"Director of IT",   company: "c_initech",   email: "leslie@initech.com",  phone: "+1 (415) 555-0103" },
    { id: "p_jacob",  name: "Jacob Jones",     title:"CEO",              company: "c_pied",      email: "jacob@piedpiper.ai",  phone: "+1 (415) 555-0166" },
    { id: "p_kristin",name: "Kristin Watson",  title:"Procurement Lead", company: "c_stark",     email: "kristin@stark.com",   phone: "+1 (415) 555-0125" },
    { id: "p_cody",   name: "Cody Fisher",     title:"Office Manager",   company: "c_dunder",    email: "cody@dundermifflin.com", phone: "+1 (415) 555-0188" },
    { id: "p_courtney",name:"Courtney Henry",  title:"VP Marketing",     company: "c_acme",      email: "courtney@acme.com",   phone: "+1 (415) 555-0144" },
    { id: "p_albert", name: "Albert Flores",   title:"Sales Director",   company: "c_globetech", email: "albert@globetech.io", phone: "+1 (415) 555-0177" },
    { id: "p_eleanor",name: "Eleanor Pena",    title:"COO",              company: "c_initech",   email: "eleanor@initech.com", phone: "+1 (415) 555-0152" },
  ];

  // status.kind tagging — Linear-style
  // lead     → unstarted
  // qualified → started
  // proposal  → started (in-progress visual)
  // negotiation → in-progress
  // won       → completed
  // lost      → canceled
  const STAGES = [
    { id: "lead",        label: "Lead",         kind: "unstarted",    pill: "unstarted"   },
    { id: "qualified",   label: "Qualified",    kind: "started",      pill: "started"     },
    { id: "proposal",    label: "Proposal",     kind: "started",      pill: "started"     },
    { id: "negotiation", label: "Negotiation",  kind: "started",      pill: "in-progress" },
    { id: "won",         label: "Won",          kind: "completed",    pill: "completed"   },
    { id: "lost",        label: "Lost",         kind: "canceled",     pill: "canceled"    },
  ];

  const OWNERS = [
    { id: "u_marina",  name: "Marina Vasquez",  initials: "MV", color: "#D97757" },
    { id: "u_theo",    name: "Theo Park",       initials: "TP", color: "#5B60E8" },
    { id: "u_ren",     name: "Ren Iwata",       initials: "RI", color: "#0EAA60" },
    { id: "u_aniya",   name: "Aniya Okafor",    initials: "AO", color: "#8E62D9" },
  ];

  const DEALS = [
    { id: "d_001", name: "Acme — Annual platform expansion",  company: "c_acme",      contact: "p_jane",     stage: "negotiation", value: 184000, owner: "u_marina", expectedClose: "2026-06-12", source: "Inbound", priority: "High",   probability: 70, nextStep: "Send revised SOW",                          createdAt: "2026-03-04" },
    { id: "d_002", name: "GlobeTech — Workflow migration",     company: "c_globetech", contact: "p_dries",    stage: "proposal",    value: 92000,  owner: "u_theo",   expectedClose: "2026-05-30", source: "Outbound", priority: "High",   probability: 55, nextStep: "Pricing review w/ legal",                  createdAt: "2026-02-18" },
    { id: "d_003", name: "Northwind — Logistics automation",   company: "c_northwind", contact: "p_brook",    stage: "qualified",   value: 48000,  owner: "u_ren",    expectedClose: "2026-07-04", source: "Referral", priority: "Medium", probability: 35, nextStep: "Schedule technical discovery",             createdAt: "2026-04-02" },
    { id: "d_004", name: "Initech — Pilot rollout",            company: "c_initech",   contact: "p_leslie",   stage: "negotiation", value: 220000, owner: "u_marina", expectedClose: "2026-05-22", source: "Outbound", priority: "High",   probability: 80, nextStep: "Final security review",                    createdAt: "2026-01-09" },
    { id: "d_005", name: "Pied Piper — POC",                   company: "c_pied",      contact: "p_jacob",    stage: "lead",        value: 12000,  owner: "u_aniya",  expectedClose: "2026-08-18", source: "Inbound", priority: "Low",    probability: 15, nextStep: "Qualify budget & timeline",                createdAt: "2026-04-29" },
    { id: "d_006", name: "Stark — Enterprise tier",            company: "c_stark",     contact: "p_kristin",  stage: "won",         value: 420000, owner: "u_theo",   expectedClose: "2026-04-30", source: "Partner",  priority: "High",   probability: 100, nextStep: "Handoff to onboarding",                  createdAt: "2025-11-12" },
    { id: "d_007", name: "Dunder Mifflin — Renewal",           company: "c_dunder",    contact: "p_cody",     stage: "won",         value: 18000,  owner: "u_ren",    expectedClose: "2026-05-02", source: "Renewal",  priority: "Medium", probability: 100, nextStep: "Send signed agreement",                   createdAt: "2026-02-22" },
    { id: "d_008", name: "Acme — Add-on: AI co-pilot",         company: "c_acme",      contact: "p_courtney", stage: "qualified",   value: 36000,  owner: "u_marina", expectedClose: "2026-07-12", source: "Expansion",priority: "Medium", probability: 45, nextStep: "Demo with marketing team",                createdAt: "2026-04-08" },
    { id: "d_009", name: "GlobeTech — Support uplift",         company: "c_globetech", contact: "p_albert",   stage: "proposal",    value: 24000,  owner: "u_theo",   expectedClose: "2026-06-04", source: "Expansion",priority: "Low",    probability: 50, nextStep: "Confirm support tier",                    createdAt: "2026-03-19" },
    { id: "d_010", name: "Initech — Security audit add-on",    company: "c_initech",   contact: "p_eleanor",  stage: "proposal",    value: 64000,  owner: "u_aniya",  expectedClose: "2026-06-22", source: "Inbound",  priority: "High",   probability: 60, nextStep: "Send proposal v2",                        createdAt: "2026-03-25" },
    { id: "d_011", name: "Northwind — Pilot expansion",        company: "c_northwind", contact: "p_brook",    stage: "lost",        value: 28000,  owner: "u_ren",    expectedClose: "2026-04-18", source: "Outbound", priority: "Medium", probability: 0,  nextStep: "Lost to competitor",                       createdAt: "2026-02-01" },
    { id: "d_012", name: "Pied Piper — Series A migration",    company: "c_pied",      contact: "p_jacob",    stage: "qualified",   value: 76000,  owner: "u_aniya",  expectedClose: "2026-07-30", source: "Inbound",  priority: "High",   probability: 40, nextStep: "Architecture deep dive",                   createdAt: "2026-04-12" },
    { id: "d_013", name: "Stark — R&D toolkit",                company: "c_stark",     contact: "p_kristin",  stage: "lead",        value: 9500,   owner: "u_theo",   expectedClose: "2026-08-01", source: "Inbound",  priority: "Low",    probability: 20, nextStep: "Initial intro call",                      createdAt: "2026-05-02" },
    { id: "d_014", name: "Dunder Mifflin — New region",        company: "c_dunder",    contact: "p_cody",     stage: "negotiation", value: 31000,  owner: "u_marina", expectedClose: "2026-05-28", source: "Expansion",priority: "Medium", probability: 65, nextStep: "Confirm regional pricing",                 createdAt: "2026-03-30" },
    { id: "d_015", name: "Acme — Training package",            company: "c_acme",      contact: "p_jane",     stage: "won",         value: 14000,  owner: "u_marina", expectedClose: "2026-04-22", source: "Expansion",priority: "Low",    probability: 100, nextStep: "Schedule first cohort",                   createdAt: "2026-03-12" },
    { id: "d_016", name: "Initech — Lost rebid",               company: "c_initech",   contact: "p_leslie",   stage: "lost",        value: 54000,  owner: "u_aniya",  expectedClose: "2026-03-15", source: "Outbound", priority: "Medium", probability: 0,  nextStep: "Followup in Q3",                          createdAt: "2026-01-29" },
  ];

  const ACTIVITIES = [
    { id: "a_01", deal: "d_001", type: "Email",    title: "Sent revised SOW draft",          who: "u_marina", when: "2 hours ago" },
    { id: "a_02", deal: "d_001", type: "Call",     title: "Discovery follow-up w/ Jane",     who: "u_marina", when: "yesterday" },
    { id: "a_03", deal: "d_001", type: "Meeting",  title: "Procurement review",              who: "u_marina", when: "3 days ago" },
    { id: "a_04", deal: "d_001", type: "Note",     title: "Jane flagged Q3 budget freeze risk", who: "u_marina", when: "5 days ago" },
  ];

  const WORKFLOWS = [
    { id: "wf_won",       name: "Mark deal won → notify team",       lastRun: "2 minutes ago", status: "active", runs: 28 },
    { id: "wf_lost",      name: "Mark deal lost → record reason",    lastRun: "yesterday",     status: "active", runs: 12 },
    { id: "wf_handoff",   name: "Handoff to onboarding",             lastRun: "today",         status: "active", runs: 7 },
    { id: "wf_invoice",   name: "Generate Stripe invoice on win",    lastRun: "2 minutes ago", status: "active", runs: 28 },
    { id: "wf_slack",     name: "Post to #wins in Slack",            lastRun: "2 minutes ago", status: "active", runs: 28 },
    { id: "wf_calendar",  name: "Create kickoff calendar invite",    lastRun: "today",         status: "paused", runs: 5 },
  ];

  const DASHBOARDS = [
    { id: "db_crm",       name: "Sales CRM",            description: "Deals, contacts and accounts pipeline", entities: 4, views: 6, status: "active",   updated: "2 min ago",  owner: "Marina V." },
    { id: "db_support",   name: "Customer Support",     description: "Tickets, SLAs and CSAT trends",         entities: 3, views: 4, status: "active",   updated: "1h ago",     owner: "Theo P."   },
    { id: "db_inventory", name: "Warehouse Inventory",  description: "SKUs, restocks and shipment plan",      entities: 5, views: 7, status: "draft",    updated: "yesterday",  owner: "Ren I."    },
    { id: "db_finance",   name: "FP&A Workspace",       description: "Budget vs actuals, vendor invoices",    entities: 3, views: 5, status: "active",   updated: "3 days ago", owner: "Aniya O."  },
  ];

  return { COMPANIES, CONTACTS, STAGES, OWNERS, DEALS, ACTIVITIES, WORKFLOWS, DASHBOARDS };
})();

// Helpers
window.byId = (arr, id) => arr.find(x => x.id === id);
window.fmtMoney = (n) => {
  if (n >= 1000000) return "$" + (n/1000000).toFixed(1) + "M";
  if (n >= 1000)    return "$" + (n/1000).toFixed(n >= 10000 ? 0 : 1) + "k";
  return "$" + n;
};
window.fmtMoneyFull = (n) => "$" + n.toLocaleString("en-US");
window.stageById = (id) => window.SEED.STAGES.find(s => s.id === id);
window.ownerById = (id) => window.SEED.OWNERS.find(o => o.id === id);
window.companyById = (id) => window.SEED.COMPANIES.find(c => c.id === id);
window.contactById = (id) => window.SEED.CONTACTS.find(c => c.id === id);
