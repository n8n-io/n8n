#!/usr/bin/env python3
"""Closed, non-executable grammar for design-system decision rules."""

import json
import re

CONDITION_SIGNALS = {
    "if_booking": ("booking", "appointment", "calendar"),
    "if_boutique": ("boutique",),
    "if_casual": ("casual", "playful"),
    "if_checkout": ("checkout", "payment", "purchase"),
    "if_children": ("child", "children", "kids"),
    "if_collaboration": ("collaboration", "multiplayer", "co-edit"),
    "if_competitive": ("competitive", "leaderboard"),
    "if_content_focused": ("content", "article", "reading", "documentation"),
    "if_conversion_focused": ("conversion", "sales", "signup", "purchase"),
    "if_creative_field": ("creative", "artist", "portfolio"),
    "if_crop_focused": ("crop", "farm", "agriculture"),
    "if_dashboard": ("dashboard", "operations", "monitoring"),
    "if_data_heavy": ("data heavy", "data-heavy", "analytics", "large dataset"),
    "if_delivery": ("delivery", "courier", "shipping"),
    "if_discovery_focused": ("discover", "discovery", "browse", "directory"),
    "if_engagement_metric": ("engagement", "retention", "contribution"),
    "if_experience_focused": ("experience", "immersive", "journey"),
    "if_gamification": ("gamification", "badges", "streak"),
    "if_health": ("health", "medical", "patient"),
    "if_hero_needed": ("hero", "showcase", "launch"),
    "if_large_dataset": ("large dataset", "thousands", "millions"),
    "if_light_mode_needed": ("light mode", "light theme"),
    "if_low_performance": ("low performance", "low-end", "slow device"),
    "if_luxury": ("luxury", "premium", "high-end"),
    "if_medication": ("medication", "medicine", "prescription"),
    "if_meditation": ("meditation", "breathing", "mindfulness"),
    "if_minimal_portfolio": ("minimal portfolio", "simple portfolio"),
    "if_mobile": ("mobile", "phone", "tablet", "ios", "android"),
    "if_personalized": ("personalized", "personalised", "recommendation"),
    "if_pre_launch": ("pre-launch", "prelaunch", "coming soon", "waitlist"),
    "if_salary_focused": ("salary", "compensation", "pay range"),
    "if_team_collaboration": ("team collaboration", "team workspace"),
    "if_trust_needed": ("trust", "secure", "verified", "authority"),
    "if_ux_focused": ("ux", "usability", "accessibility", "accessible"),
    "if_video_ready": ("video ready", "product video", "demo video"),
}

ALLOWED_CONDITIONS = {"must_have", *CONDITION_SIGNALS}
ACTION_PREFIXES = {"constraint", "style", "pattern", "mode"}
TOKEN_ACTION_PREFIXES = {"constraint", "style"}
TOKEN_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
CONDITION_PATTERNS = {
    condition: tuple(
        re.compile(r"(?<!\w)" + re.escape(signal) + r"(?!\w)")
        for signal in signals
    )
    for condition, signals in CONDITION_SIGNALS.items()
}


def _object_without_duplicates(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("duplicate decision-rule key: {}".format(key))
        result[key] = value
    return result


def parse_decision_rules(raw):
    """Parse the canonical condition -> action-array representation."""
    try:
        rules = json.loads(raw or "{}", object_pairs_hook=_object_without_duplicates)
    except json.JSONDecodeError as error:
        raise ValueError("invalid decision-rule JSON: {}".format(error)) from error
    if not isinstance(rules, dict):
        raise ValueError("decision rules must be a JSON object")
    for condition, actions in rules.items():
        if condition not in ALLOWED_CONDITIONS:
            raise ValueError("unknown decision-rule condition: {}".format(condition))
        if not isinstance(actions, list) or not actions:
            raise ValueError("{} must map to a non-empty action array".format(condition))
        for action in actions:
            _validate_action(action)
        if len(actions) != len(set(actions)):
            raise ValueError("{} contains duplicate actions".format(condition))
    return rules


def _validate_action(action):
    if not isinstance(action, str) or ":" not in action:
        raise ValueError("action must use a known prefix: {}".format(action))
    prefix, value = action.split(":", 1)
    if prefix not in ACTION_PREFIXES:
        raise ValueError("unknown decision-rule action: {}".format(action))
    if prefix in TOKEN_ACTION_PREFIXES and not TOKEN_RE.fullmatch(value):
        raise ValueError("invalid {} action value: {}".format(prefix, value))
    if prefix == "pattern" and not value.strip():
        raise ValueError("pattern action must name a pattern")
    if prefix == "mode" and value not in {"dark", "light"}:
        raise ValueError("mode action must be dark or light")


def apply_decision_rules(rules, query):
    """Return deterministic mutations and an audit trail; never execute data."""
    normalized = str(query or "").casefold()
    result = {"activated": [], "style_ids": [], "constraints": [],
              "pattern": None, "mode": None}
    for condition, actions in rules.items():
        active = condition == "must_have" or any(
            pattern.search(normalized)
            for pattern in CONDITION_PATTERNS.get(condition, ()))
        if not active:
            continue
        result["activated"].append({"condition": condition, "actions": list(actions)})
        for action in actions:
            prefix, value = action.split(":", 1)
            if prefix == "style" and value not in result["style_ids"]:
                result["style_ids"].append(value)
            elif prefix == "constraint" and value not in result["constraints"]:
                result["constraints"].append(value)
            elif prefix == "pattern":
                result["pattern"] = value
            elif prefix == "mode":
                result["mode"] = value
    return result
