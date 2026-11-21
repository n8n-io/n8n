#!/usr/bin/env python3
"""Vérifie qu'un fichier workflow n8n est bien formé avant son import.

Usage : python3 validate_workflow.py <workflow.json> [<autre.json> ...]
Code de sortie 0 si aucune erreur (les avertissements n'empêchent pas l'import).
"""
import json
import re
import sys

# Types de nœuds du catalogue (references/nodes.md). Un type hors liste
# produit un avertissement, pas une erreur : il peut être volontaire.
KNOWN_TYPES = {
    "n8n-nodes-base.manualTrigger",
    "n8n-nodes-base.scheduleTrigger",
    "n8n-nodes-base.webhook",
    "n8n-nodes-base.respondToWebhook",
    "n8n-nodes-base.telegramTrigger",
    "n8n-nodes-base.telegram",
    "n8n-nodes-base.httpRequest",
    "n8n-nodes-base.httpRequestTool",
    "n8n-nodes-base.set",
    "n8n-nodes-base.if",
    "n8n-nodes-base.code",
    "n8n-nodes-base.gmail",
    "n8n-nodes-base.gmailTool",
    "n8n-nodes-base.googleSheets",
    "n8n-nodes-base.googleSheetsTool",
    "@n8n/n8n-nodes-langchain.chatTrigger",
    "@n8n/n8n-nodes-langchain.agent",
    "@n8n/n8n-nodes-langchain.lmChatAnthropic",
    "@n8n/n8n-nodes-langchain.lmChatOpenAi",
    "@n8n/n8n-nodes-langchain.lmChatGoogleGemini",
    "@n8n/n8n-nodes-langchain.memoryBufferWindow",
    "@n8n/n8n-nodes-langchain.toolThink",
    "@n8n/n8n-nodes-langchain.toolCalculator",
    "@n8n/n8n-nodes-langchain.toolWikipedia",
    "@n8n/n8n-nodes-langchain.toolWorkflow",
}

TRIGGER_HINTS = ("Trigger", ".webhook")
AGENT_TYPE = "@n8n/n8n-nodes-langchain.agent"

# Type de connexion attendu pour chaque famille de sous-nœuds.
def expected_connection(node_type):
    short = node_type.split(".")[-1]
    if short.startswith("lmChat"):
        return "ai_languageModel"
    if short.startswith("memory"):
        return "ai_memory"
    if short.startswith("tool") or short.endswith("Tool"):
        return "ai_tool"
    return None

SECRET_PATTERNS = [
    (re.compile(r"sk-ant-[A-Za-z0-9_-]{10,}"), "clé API Anthropic"),
    (re.compile(r"\bsk-[A-Za-z0-9_-]{20,}"), "clé API OpenAI"),
    (re.compile(r"\b\d{8,10}:[A-Za-z0-9_-]{30,}\b"), "token de bot Telegram"),
    (re.compile(r"AIza[0-9A-Za-z_-]{30,}"), "clé API Google"),
]


def validate(path):
    errors, warnings = [], []
    try:
        with open(path, encoding="utf-8") as f:
            raw = f.read()
        wf = json.loads(raw)
    except (OSError, json.JSONDecodeError) as e:
        return [f"fichier illisible ou JSON invalide : {e}"], []

    if not isinstance(wf, dict):
        return ["le fichier doit contenir un objet JSON"], []
    nodes = wf.get("nodes")
    connections = wf.get("connections")
    if not isinstance(nodes, list) or not nodes:
        errors.append("« nodes » doit être une liste non vide")
        return errors, warnings
    if not isinstance(connections, dict):
        errors.append("« connections » doit être un objet")
        connections = {}

    by_name, ids = {}, set()
    for i, n in enumerate(nodes):
        label = f"nœud n°{i + 1}"
        if not isinstance(n, dict):
            errors.append(f"{label} : doit être un objet")
            continue
        name = n.get("name")
        if not name:
            errors.append(f"{label} : « name » manquant")
            continue
        label = f"nœud « {name} »"
        if name in by_name:
            errors.append(f"{label} : nom en double (les connexions utilisent les noms)")
        by_name[name] = n
        if not n.get("type"):
            errors.append(f"{label} : champ « type » manquant")
        if not isinstance(n.get("typeVersion"), (int, float)):
            errors.append(f"{label} : « typeVersion » manquant ou non numérique")
        pos = n.get("position")
        if not (isinstance(pos, list) and len(pos) == 2):
            errors.append(f"{label} : « position » doit être [x, y]")
        # n8n tolère un nœud sans paramètres (valeurs par défaut), pas un mauvais type.
        if "parameters" not in n:
            warnings.append(f"{label} : pas de « parameters », valeurs par défaut utilisées")
        elif not isinstance(n["parameters"], dict):
            errors.append(f"{label} : « parameters » doit être un objet")
        nid = n.get("id")
        if not nid:
            warnings.append(f"{label} : pas d'« id » (n8n en créera un)")
        elif nid in ids:
            errors.append(f"{label} : « id » en double")
        ids.add(nid)
        ntype = n.get("type", "")
        if ntype and ntype not in KNOWN_TYPES:
            warnings.append(f"{label} : type « {ntype} » hors catalogue, vérifie qu'il existe")

    # Connexions : sources et cibles existantes, bon type pour les sous-nœuds.
    incoming = {name: {} for name in by_name}
    for src, outputs in connections.items():
        if src not in by_name:
            errors.append(f"connexion depuis « {src} » : ce nœud n'existe pas")
            continue
        if not isinstance(outputs, dict):
            errors.append(f"connexions de « {src} » : format invalide")
            continue
        expected = expected_connection(by_name[src].get("type", ""))
        for conn_type, branches in outputs.items():
            if expected and conn_type != expected:
                errors.append(
                    f"« {src} » doit se brancher avec « {expected} », pas « {conn_type} »"
                )
            # Les autres familles IA (analyseur de sortie, embeddings…) ont leur propre type ai_*.
            if not expected and conn_type != "main" and not conn_type.startswith("ai_"):
                errors.append(f"« {src} » : type de connexion « {conn_type} » inattendu")
            for branch in branches or []:
                for link in branch or []:
                    target = link.get("node") if isinstance(link, dict) else None
                    if target not in by_name:
                        errors.append(f"connexion « {src} » → « {target} » : cible inconnue")
                        continue
                    if link.get("type") != conn_type:
                        errors.append(
                            f"connexion « {src} » → « {target} » : "
                            f"« type » doit valoir « {conn_type} »"
                        )
                    counts = incoming[target]
                    counts[conn_type] = counts.get(conn_type, 0) + 1

    # Un agent a exactement un modèle et reçoit des données.
    for name, n in by_name.items():
        if n.get("type") != AGENT_TYPE:
            continue
        models = incoming[name].get("ai_languageModel", 0)
        if models != 1:
            errors.append(f"agent « {name} » : il faut exactement 1 modèle branché ({models} trouvé)")
        if not incoming[name].get("main"):
            errors.append(f"agent « {name} » : aucun nœud ne lui envoie de données")
        params = n.get("parameters") if isinstance(n.get("parameters"), dict) else {}
        opts = params.get("options") if isinstance(params.get("options"), dict) else {}
        if not opts.get("systemMessage"):
            warnings.append(f"agent « {name} » : pas de prompt système, l'agent improvisera")

    # Sous-nœuds isolés : ils ne servent à rien sans agent.
    for name, n in by_name.items():
        if expected_connection(n.get("type", "")) and name not in connections:
            errors.append(f"sous-nœud « {name} » : branché à aucun agent")

    if not any(any(h in n.get("type", "") for h in TRIGGER_HINTS) for n in by_name.values()):
        warnings.append("aucun déclencheur : le workflow ne se lancera qu'à la main")

    for pattern, label in SECRET_PATTERNS:
        if pattern.search(raw):
            errors.append(f"secret détecté ({label}) : mets-le dans les identifiants n8n")
    if "REMPLACER" in raw:
        warnings.append("des valeurs « REMPLACER… » restent à remplir par l'utilisateur")

    return errors, warnings


def main(argv):
    if len(argv) < 2:
        print(__doc__.strip())
        return 2
    status = 0
    for path in argv[1:]:
        errors, warnings = validate(path)
        print(f"== {path}")
        for e in errors:
            print(f"  ERREUR : {e}")
        for w in warnings:
            print(f"  attention : {w}")
        if errors:
            status = 1
        else:
            print("  OK")
    return status


if __name__ == "__main__":
    sys.exit(main(sys.argv))
