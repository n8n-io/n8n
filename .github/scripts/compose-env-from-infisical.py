#!/usr/bin/env python3
"""
从进程环境生成 docker compose 可用的 .env（stdout 输出）。

排除：SSH/ECS 部署用变量、GitHub Actions / Runner 注入的常见变量，
避免把 CI 噪声写进 .env。

Infisical secrets-action 会把密钥以「与 Infisical 中同名」的环境变量注入；
本脚本把这些（及你希望保留的其它非排除项）全部写入 .env。
"""
from __future__ import annotations

import os
import re
import sys

# 部署基础设施（仅 CI/SSH 使用，不应出现在 compose .env）
_DENY_EXACT = frozenset(
    {
        "ECS_HOST",
        "ECS_USER",
        "ECS_SSH_PRIVATE_KEY",
        "ECS_DEPLOY_PATH",
        # 阿里云 ACR：仅用于 ECS 上 docker login，不应写入 compose .env
        "ACR_USERNAME",
        "ACR_PASSWORD",
    }
)

# 前缀：典型 CI / Agent / 工具链
_DENY_PREFIXES = (
    "GITHUB_",
    "RUNNER_",
    "ACTIONS_",
    "AGENT_",
    "INPUT_",
    "STATE_",
    "JAVA_",
    "NVM_",
    "DOTNET_",
    "ANDROID_",
    "CHROME_",
    "GECKO_",
    "SELENIUM_",
    "GRADLE_",
    "ANT_",
    "M2_",
)

# 精确排除：常见 shell / runner 环境（非业务密钥）
_DENY_EXACT |= frozenset(
    {
        "CI",
        "HOME",
        "PATH",
        "PWD",
        "USER",
        "LOGNAME",
        "SHELL",
        "SHLVL",
        "LANG",
        "LC_ALL",
        "TERM",
        "INVOCATION_ID",
        "JOURNAL_STREAM",
        "XDG_RUNTIME_DIR",
        "XDG_CONFIG_HOME",
        "XDG_CACHE_HOME",
        "SSH_AUTH_SOCK",
        "LS_COLORS",
        "LESSOPEN",
        "LESSCLOSE",
        "DEBIAN_FRONTEND",
        "ImageOS",
        "GOROOT",
        "GOPATH",
        "GOMODCACHE",
        "_",
    }
)


def _deny_key(key: str) -> bool:
    if key in _DENY_EXACT:
        return True
    if key.startswith(_DENY_PREFIXES):
        return True
    # 非法变量名（compose 环境名通常 [A-Za-z_][A-Za-z0-9_]*）
    if not re.match(r"^[A-Za-z_][A-Za-z0-9_]*$", key):
        return True
    return False


def _escape_value(val: str) -> str:
    """docker compose .env：含空白、#、$ 等时用双引号包裹并转义。"""
    if val == "":
        return '""'
    _special = ' \t\n\r#"\'\\$`'
    need_quote = any(c in val for c in _special)
    if "\n" in val or "\r" in val:
        # 多行值：compose 支持有限，这里用双引号 + \n 转义
        escaped = (
            val.replace("\\", "\\\\")
            .replace('"', '\\"')
            .replace("\n", "\\n")
            .replace("\r", "")
        )
        return f'"{escaped}"'
    if need_quote:
        escaped = val.replace("\\", "\\\\").replace('"', '\\"')
        return f'"{escaped}"'
    return val


def main() -> int:
    lines: list[str] = []
    for key in sorted(os.environ.keys()):
        if _deny_key(key):
            continue
        val = os.environ[key]
        lines.append(f"{key}={_escape_value(val)}")

    sys.stdout.write("\n".join(lines))
    if lines:
        sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
