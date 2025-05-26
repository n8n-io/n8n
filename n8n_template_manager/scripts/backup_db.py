#!/usr/bin/env python3
import pathlib
import shutil
import datetime
import os

# Assuming this script is in n8n_template_manager/scripts/
# and the database is in n8n_template_manager/
# So, DB_PATH will be ../n8n_templates.db relative to this script's location.
SCRIPT_DIR = pathlib.Path(__file__).resolve().parent
DB_PATH = SCRIPT_DIR.parent / "n8n_templates.db"
BACKUP_DIR = SCRIPT_DIR.parent / "db_backups"

def main():
    """
    Backs up the n8n_templates.db file to a timestamped file in the db_backups directory.
    """
    try:
        # Ensure the backup directory exists
        BACKUP_DIR.mkdir(parents=True, exist_ok=True)
        print(f"Backup directory ensured at: {BACKUP_DIR.resolve()}")

        # Check if the source database file exists
        if not DB_PATH.exists():
            print(f"Error: Database file not found at {DB_PATH.resolve()}")
            # Attempt to locate it in the current working directory if script is run from project root
            # This is a fallback if the relative path from script location fails
            # This part of the logic might be removed if strict pathing is preferred
            dynamic_db_path_from_cwd = pathlib.Path.cwd() / "n8n_templates.db"
            if dynamic_db_path_from_cwd.exists():
                print(f"Found database at current working directory: {dynamic_db_path_from_cwd.resolve()}")
                current_db_path = dynamic_db_path_from_cwd
            else:
                print(f"Also not found at {dynamic_db_path_from_cwd.resolve()}. Exiting.")
                return 1 # Exit with error code
        else:
            current_db_path = DB_PATH
            print(f"Database found at: {current_db_path.resolve()}")


        # Create a timestamped backup filename
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_filename = f"backup_{timestamp}.db"
        
        # Construct the full destination path for the backup file
        destination_path = BACKUP_DIR / backup_filename
        
        # Copy the database file
        shutil.copy2(current_db_path, destination_path)
        
        print(f"Successfully backed up database to: {destination_path.resolve()}")
        return 0 # Exit with success code

    except FileNotFoundError as fnf_error:
        # This might be redundant if the initial check handles it, but good for other file ops
        print(f"Error: File not found during operation. {fnf_error}")
        return 1
    except PermissionError as perm_error:
        print(f"Error: Permission denied. Check file/directory permissions. {perm_error}")
        return 1
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return 1

if __name__ == "__main__":
    exit_code = main()
    if exit_code == 0:
        print("Backup process completed successfully.")
    else:
        print("Backup process failed.")
    # Standard library sys.exit(exit_code) could be used if preferred
    # For now, simple print and implicit exit via script end.
