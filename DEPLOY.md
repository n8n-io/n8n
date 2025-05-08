# Despliegue a Google Cloud

Este repositorio contiene scripts para automatizar el despliegue de n8n-rankia en Google Cloud Platform.

## Requisitos previos

Para ejecutar estos scripts, necesitas:

1. **Google Cloud SDK** - [Instrucciones de instalación](https://cloud.google.com/sdk/docs/install)
2. **shellcheck** - Herramienta para verificar scripts bash:
   - macOS: `brew install shellcheck`
   - Linux: `apt-get install shellcheck`
3. **Cuenta de Google Cloud** con:
   - Servicio Cloud Run habilitado
   - Servicio Cloud SQL for PostgreSQL habilitado
   - Servicio Memorystore for Redis habilitado
   - Servicio Secret Manager habilitado
   - Servicio Cloud Storage habilitado
   - Permisos adecuados

## Scripts disponibles

### deploy_image_2_cloud.sh

Script principal para desplegar n8n-rankia en Google Cloud Run, con integración de Cloud Storage para datos binarios.

**Características:**
- Utiliza secretos almacenados en Secret Manager para información sensible
- Configura conexiones a Cloud SQL y Redis
- Configura almacenamiento binario en Google Cloud Storage
- Gestiona el despliegue a Cloud Run

**Uso:**
```bash
bash ./deploy_image_2_cloud.sh
```

## Configuración de secretos

Los siguientes secretos deben estar configurados en Secret Manager:

1. **n8n-rankia-db-password**: Contraseña de la base de datos PostgreSQL
2. **n8n-rankia-encryption-key**: Clave de encriptación para n8n

Para crear estos secretos:

```bash
# Crear el secreto de la contraseña de la base de datos
echo "TU_CONTRASEÑA_SEGURA" | gcloud secrets create n8n-rankia-db-password \
  --data-file=- \
  --replication-policy="automatic" \
  --project="varhall"

# Crear el secreto de la clave de encriptación
echo "TU_CLAVE_DE_ENCRIPTACION" | gcloud secrets create n8n-rankia-encryption-key \
  --data-file=- \
  --replication-policy="automatic" \
  --project="varhall"
```

## Configuración de Cloud Storage

El bucket de Google Cloud Storage debe estar creado previamente:

```bash
gcloud storage buckets create gs://n8n-rankia-binary-data \
  --location=europe-west1 \
  --project=varhall
```

## Buenas prácticas

Para mantener el código de despliegue limpio y seguro:

1. **Nunca** incluyas credenciales o claves directamente en los scripts
2. Utiliza Secret Manager para almacenar información sensible
3. Utiliza shellcheck para verificar los scripts bash antes de commit
4. Sigue las convenciones de código establecidas en el proyecto

## Solución de problemas

Si encuentras errores en el despliegue:

1. Revisa los logs en Cloud Run: `gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=n8n-rankia AND severity>=ERROR" --project=varhall --limit=10`
2. Verifica que los secretos en Secret Manager tengan los valores correctos
3. Confirma que el bucket de Cloud Storage exista y tenga los permisos adecuados 