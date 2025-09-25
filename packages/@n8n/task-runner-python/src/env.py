import os
from pathlib import Path
from typing import Optional


def read_env(env_name: str) -> Optional[str]:
    if env_name in os.environ:
        return os.environ[env_name]

    file_path_key = f"{env_name}_FILE"
    if file_path_key in os.environ:
        file_path = os.environ[file_path_key]
        try:
            return Path(file_path).read_text(encoding="utf-8").strip()
        except (OSError, IOError) as e:
            raise ValueError(f"Failed to read {env_name} from file {file_path}: {e}")

    return None
